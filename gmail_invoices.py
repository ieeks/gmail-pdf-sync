#!/usr/bin/env python3
"""
gmail_invoices.py — Verbund-Stromrechnungen aus Gmail herunterladen

Verbindet sich per IMAP mit Gmail, durchsucht die letzten LOOKBACK_DAYS Tage im
Label "Rechnungen", lädt Verbund-PDF-Anhänge herunter und ruft extract_verbund.py auf.

WICHTIG: Das Postfach wird von einem zweiten Tool (finance-dashboard) mitgenutzt,
das UNSEEN als Warteschlange verwendet. Dieses Skript arbeitet deshalb strikt
read-only — es setzt keine Flags und verändert nichts am Postfach.
"""

import imaplib
import email
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta
from email.header import decode_header
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

# ── Konfiguration ──────────────────────────────────────────────────────────────
GMAIL_USER         = "manuel.rechnungen@gmail.com"
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
GMAIL_LABEL        = "Rechnungen"              # exakter Label-Name in Gmail
PDF_TEMP_DIR       = Path(tempfile.mkdtemp())

# Wie weit zurück gesucht wird. Der Cron läuft täglich; 14 Tage überbrücken
# ausgefallene Läufe, ohne das ganze Postfach zu durchsuchen.
LOOKBACK_DAYS      = 14

# Mails, die vom Postfach-Inhaber selbst kommen (Portal-Download an sich selbst
# geschickt, manuelle Weiterleitung), werden immer geprüft — Betreff und
# Dateiname sind dann egal. Die Fremdrechnungen des finance-dashboards kommen
# von externen Absendern und bleiben davon unberührt.
SELF_SENT_IS_VERBUND = True

# Das Postfach teilen wir uns mit dem finance-dashboard, das UNSEEN als
# Warteschlange nutzt. Niemals auf True setzen, solange das so ist — sonst
# verschwinden dort Rechnungen, bevor sie verarbeitet wurden.
MARK_AS_READ       = False

EXTRACT_SCRIPT     = SCRIPT_DIR / "extract_verbund.py"

# Exit-Codes von extract_verbund.py
EXTRACT_OK          = 0   # Rechnung neu übernommen
EXTRACT_ERROR       = 1   # Verbund-Rechnung, aber Extraktion fehlgeschlagen
EXTRACT_NOT_VERBUND = 2   # Gar keine Verbund-Rechnung
EXTRACT_DUPLIKAT    = 3   # Verbund-Rechnung, war aber schon bekannt
# ───────────────────────────────────────────────────────────────────────────────

# IMAP-Datumsformat ist immer englisch — strftime("%b") wäre locale-abhängig.
IMAP_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Dateinamen der Verbund-Rechnungen:
#   31216855_3004883222_31072026_3102601558720_10_2026_R_2437.pdf
#   Kund:innen-Nr _ Anlagen-Nr _ Datum _ Rechnungs-Nr _ Monat _ Jahr _ R _ lfd. Nr.
RE_VERBUND_ATTACHMENT = re.compile(
    r"\d{6,}_\d{6,}_\d{8}_\d{6,}_\d{1,2}_\d{4}_R_\d+\.pdf", re.IGNORECASE
)

MONTH_NAMES = {
    1: "01_Januar", 2: "02_Februar", 3: "03_März",    4: "04_April",
    5: "05_Mai",    6: "06_Juni",    7: "07_Juli",     8: "08_August",
    9: "09_September", 10: "10_Oktober", 11: "11_November", 12: "12_Dezember",
}


def decode_str(value: str) -> str:
    """E-Mail-Header dekodieren (z. B. encoded UTF-8 oder Latin-1)."""
    parts = decode_header(value)
    result = []
    for part, charset in parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def safe_filename(name: str) -> str:
    """Sonderzeichen aus Dateinamen entfernen."""
    keep = " ._-"
    return "".join(c if (c.isalnum() or c in keep) else "_" for c in name).strip()


def list_labels(mail: imaplib.IMAP4_SSL) -> None:
    """Alle Gmail-Labels ausgeben (zum Debuggen)."""
    _, labels = mail.list()
    print("Verfügbare Labels:")
    for label in labels:
        print(" ", label.decode())


def imap_date(dt: datetime) -> str:
    """datetime → IMAP-Datum (z. B. '05-Aug-2026')."""
    return f"{dt.day:02d}-{IMAP_MONTHS[dt.month - 1]}-{dt.year}"


def has_pdf_attachment(bodystructure: str) -> bool:
    """Erkennt PDF-Anhänge an der BODYSTRUCTURE — ohne die Mail zu laden."""
    bs = bodystructure.lower()
    return "application/pdf" in bs or '"pdf"' in bs or ".pdf" in bs


def looks_like_verbund(subject: str, sender: str, bodystructure: str) -> bool:
    """
    Grober Vorfilter, damit im gemeinsam genutzten Postfach nicht hunderte
    fremde Rechnungen heruntergeladen werden. Bewusst als ODER über mehrere
    unabhängige Signale — fällt eines aus, greifen die anderen:

      1. Absender/Betreff der Original-Mail von VERBUND
         ("VERBUND <...@verbund.at>", "Ihre Energierechnung ist da!",
          weitergeleitet: "WG: Ihre Energierechnung ist da!")
      2. Dateiname des Anhangs im Verbund-Schema
         (bleibt auch bei Weiterleitung und Portal-Download erhalten)
      3. Absender ist das Postfach selbst — dann sind Betreff und Dateiname
         egal (Portal-Download, den man sich selbst schickt)

    Die endgültige Entscheidung trifft immer extract_verbund.py am Zählpunkt
    im PDF — hier wird nur vorsortiert.
    """
    haystack = f"{subject} {sender}".lower()
    if "verbund" in haystack or "energierechnung" in haystack:
        return True
    if SELF_SENT_IS_VERBUND and GMAIL_USER.lower() in sender.lower():
        return True
    return bool(RE_VERBUND_ATTACHMENT.search(bodystructure))


def download_pdfs(mail: imaplib.IMAP4_SSL, msg_id: bytes) -> list[Path]:
    """Alle PDF-Anhänge einer E-Mail herunterladen. Gibt Liste der Pfade zurück."""
    # BODY.PEEK statt RFC822: der Server setzt dabei kein \Seen-Flag.
    _, msg_data = mail.fetch(msg_id, "(BODY.PEEK[])")
    raw = msg_data[0][1]
    msg = email.message_from_bytes(raw)

    # Datum und Absender aus Header
    date_str = msg.get("Date", "")
    try:
        date_obj = email.utils.parsedate_to_datetime(date_str)
    except Exception:
        date_obj = datetime.now()

    sender_full = decode_str(msg.get("From", "unknown"))
    # Nur den Namen / die Domain verwenden, keine E-Mail-Adresse
    sender = sender_full.split("<")[0].strip() or sender_full.split("@")[0].strip("\"'")
    sender = safe_filename(sender)[:40]

    year  = date_obj.year
    month = date_obj.month
    date_prefix = date_obj.strftime("%Y-%m-%d")

    target_dir = PDF_TEMP_DIR / str(year) / MONTH_NAMES[month]
    target_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[Path] = []

    for part in msg.walk():
        content_type = part.get_content_type()
        disposition  = str(part.get("Content-Disposition", ""))

        is_pdf = (
            content_type == "application/pdf"
            or (content_type == "application/octet-stream" and "pdf" in disposition.lower())
            or ("attachment" in disposition.lower() and disposition.lower().endswith(".pdf"))
        )

        if not is_pdf:
            filename = part.get_filename()
            if filename and filename.lower().endswith(".pdf"):
                is_pdf = True

        if not is_pdf:
            continue

        raw_filename = part.get_filename() or "attachment.pdf"
        orig_name    = safe_filename(decode_str(raw_filename))
        new_name     = f"{date_prefix}_{sender}_{orig_name}"
        dest         = target_dir / new_name

        # Duplikat-Check
        if dest.exists():
            print(f"  Bereits vorhanden, übersprungen: {dest.name}")
            saved_paths.append(dest)
            continue

        payload = part.get_payload(decode=True)
        if not payload:
            continue

        dest.write_bytes(payload)
        print(f"  Gespeichert: {dest}")
        saved_paths.append(dest)

    return saved_paths


def run_extract(pdf_path: Path) -> int:
    """extract_verbund.py für ein PDF aufrufen. Gibt den Exit-Code zurück."""
    if not EXTRACT_SCRIPT.exists():
        print(f"  WARNUNG: {EXTRACT_SCRIPT} nicht gefunden, Extraktion übersprungen.")
        return EXTRACT_ERROR
    print(f"  Extrahiere Daten aus: {pdf_path.name}")
    result = subprocess.run(
        [sys.executable, str(EXTRACT_SCRIPT), str(pdf_path)],
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode not in (EXTRACT_OK, EXTRACT_NOT_VERBUND, EXTRACT_DUPLIKAT) and result.stderr:
        print(f"  FEHLER bei Extraktion: {result.stderr.rstrip()}")
    return result.returncode


def main() -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] gmail_invoices.py gestartet")

    # IMAP-Verbindung
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    except imaplib.IMAP4.error as exc:
        print(f"FEHLER: Anmeldung fehlgeschlagen — {exc}")
        print("Tipp: App-Passwort prüfen und IMAP in Gmail aktivieren.")
        sys.exit(1)

    # Label auswählen — read-only, solange wir uns das Postfach mit dem
    # finance-dashboard teilen (siehe MARK_AS_READ).
    status, _ = mail.select(f'"{GMAIL_LABEL}"', readonly=not MARK_AS_READ)
    if status != "OK":
        print(f"FEHLER: Label '{GMAIL_LABEL}' nicht gefunden.")
        print("Verfügbare Labels:")
        list_labels(mail)
        mail.logout()
        sys.exit(1)

    # Zeitfenster statt UNSEEN: das finance-dashboard markiert Mails im selben
    # Postfach als gelesen — mit UNSEEN würden wir Rechnungen verpassen, je
    # nachdem wer zuerst läuft.
    since = imap_date(datetime.now() - timedelta(days=LOOKBACK_DAYS))
    _, msg_ids_raw = mail.search(None, "SINCE", since)
    msg_ids = msg_ids_raw[0].split()

    if not msg_ids:
        print(f"Keine E-Mails seit {since} gefunden.")
        mail.logout()
        return

    print(f"{len(msg_ids)} E-Mail(s) seit {since} im Label '{GMAIL_LABEL}'.")
    total_pdfs   = 0   # neu übernommene Rechnungen
    bekannt      = 0   # bereits bekannte Rechnungen
    geprueft     = 0
    vorsortiert  = 0

    for msg_id in msg_ids:
        # Kopfdaten und Anhang-Struktur holen — beides ohne die Mail zu laden.
        # BODY.PEEK, damit der Server kein \Seen-Flag setzt.
        _, meta = mail.fetch(
            msg_id, "(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM)] BODYSTRUCTURE)"
        )
        raw_header    = next((part[1] for part in meta if isinstance(part, tuple)), b"")
        bodystructure = " ".join(
            part.decode(errors="replace") if isinstance(part, bytes) else
            part[0].decode(errors="replace")
            for part in meta
        )

        hdr_msg = email.message_from_bytes(raw_header)
        subject = decode_str(hdr_msg.get("Subject", ""))
        sender  = decode_str(hdr_msg.get("From", ""))

        if not has_pdf_attachment(bodystructure):
            continue   # Fremde Mail ohne PDF — nicht einmal erwähnenswert

        geprueft += 1

        # Vorsortieren, damit die hunderten Fremdrechnungen im Postfach nicht
        # heruntergeladen und geparst werden. Entscheidend bleibt der Zählpunkt
        # im PDF — der Vorfilter spart nur Downloads.
        if not looks_like_verbund(subject, sender, bodystructure):
            vorsortiert += 1
            continue

        print(f"\nVerarbeite E-Mail — {subject[:70]}")
        saved = download_pdfs(mail, msg_id)
        if not saved:
            continue

        codes = [run_extract(pdf_path) for pdf_path in saved]
        total_pdfs += sum(1 for c in codes if c == EXTRACT_OK)
        bekannt    += sum(1 for c in codes if c == EXTRACT_DUPLIKAT)

        if MARK_AS_READ and EXTRACT_ERROR not in codes:
            mail.store(msg_id, "+FLAGS", "\\Seen")

    mail.logout()
    print(f"\n{geprueft} Mail(s) mit PDF-Anhang geprüft, "
          f"{vorsortiert} als fremde Rechnung übersprungen.")
    print(f"Fertig. {total_pdfs} neue Rechnung(en) übernommen, "
          f"{bekannt} bereits bekannt.")
    if not MARK_AS_READ:
        print("Postfach unverändert (read-only, keine Flags gesetzt).")


if __name__ == "__main__":
    main()
