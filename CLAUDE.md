# gmail-pdf-sync — CLAUDE.md

Dieses Projekt lädt automatisch Verbund-Stromrechnungen (PDF) aus Gmail herunter,
extrahiert relevante Zahlen (kein Datenschutz-relevantes Material) und zeigt sie
in einem GitHub Pages Dashboard an.

**Gmail-Account:** manuel.rechnungen@gmail.com  
**Zwei Haushalte:** Rennweg · Aspangstraße (inkl. Wallbox E-Auto)

---

## Projektstruktur

```
~/Developer/gmail-pdf-sync/
├── CLAUDE.md                  ← diese Datei
├── gmail_invoices.py          ← PDFs aus Gmail → iCloud Download
├── extract_verbund.py         ← PDFs parsen → data/*.json
├── data/
│   ├── rennweg.json           ← nur Zahlen, kein Datenschutz-relevantes Material
│   └── aspangstrasse.json
├── docs/
│   └── index.html             ← GitHub Pages Dashboard
└── .gitignore
```

---

## Setup (einmalig, beim ersten Start ausführen)

```bash
# 1. Projektordner
mkdir -p ~/Developer/gmail-pdf-sync/data
mkdir -p ~/Developer/gmail-pdf-sync/docs

# 2. Python-Abhängigkeit
pip3 install pdfplumber --break-system-packages

# 3. Alle Dateien aus diesem Paket in den Ordner kopieren

# 4. Zählpunkte eintragen (siehe Abschnitt unten)

# 5. Gmail App-Passwort eintragen in gmail_invoices.py

# 6. Einmalig testen
python3 ~/Developer/gmail-pdf-sync/gmail_invoices.py

# 7. Cron einrichten (täglich 08:00)
# crontab -e → folgende Zeile einfügen (DEINNAME ersetzen):
# 0 8 * * * /usr/bin/python3 /Users/DEINNAME/Developer/gmail-pdf-sync/gmail_invoices.py >> /Users/DEINNAME/Developer/gmail-pdf-sync/gmail_invoices.log 2>&1
```

---

## Zählpunkte eintragen (PFLICHT — einmalig)

Die Zählpunktnummern stehen auf Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT002...".
Beide Nummern in `extract_verbund.py` unter `ZAEHLPUNKTE` eintragen:

```python
ZAEHLPUNKTE = {
    "AT00200000000000000000000001": "rennweg",        # ← echte Nummer eintragen
    "AT00200000000000000000000002": "aspangstrasse",  # ← echte Nummer eintragen
}
```

---

## gmail_invoices.py — Spezifikation

**Was es tut:**
- Verbindet sich per IMAP mit Gmail (manuel.rechnungen@gmail.com)
- Sucht nur nach `UNSEEN` E-Mails im konfigurierten Label
- Lädt alle PDF-Anhänge in iCloud Drive herunter
- Benennt um: `YYYY-MM-DD_Absender_Originalname.pdf`
- Legt ab in: `iCloud/Invoices/YYYY/MM_Monat/`
- Markiert E-Mail danach als gelesen (`mail.store Seen`)
- Ruft danach automatisch `extract_verbund.py` für jedes neue PDF auf

**Konfiguration:**
```python
GMAIL_USER         = "manuel.rechnungen@gmail.com"
GMAIL_APP_PASSWORD = "xxxx-xxxx-xxxx-xxxx"   # Gmail App-Passwort (16-stellig)
GMAIL_LABEL        = "Rechnungen"              # exakter Label-Name in Gmail
ICLOUD_BASE        = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Invoices"
```

**Gmail App-Passwort erstellen:**
→ https://myaccount.google.com/apppasswords
→ Name: „PDF Downloader" → 16-stelliges Passwort ohne Leerzeichen eintragen

**Gmail IMAP aktivieren:**
→ Gmail → Einstellungen → Alle Einstellungen → Weiterleitung und POP/IMAP → IMAP aktivieren

---

## extract_verbund.py — Spezifikation

**Was es tut:**
- Liest ein Verbund-PDF mit `pdfplumber`
- Erkennt den Haushalt anhand des Zählpunkts (AT002...) auf Seite 2
- Extrahiert ausschließlich Zahlen — KEINE Adressen, Namen, Kundennummern
- Hängt einen Eintrag an `data/rennweg.json` oder `data/aspangstrasse.json` an
- Überspringt bereits verarbeitete Rechnungen (Duplikat-Check via Rechnungsnummer)

**Extrahierte Felder (JSON):**
```json
{
  "rechnungsdatum":   "2026-02-04",
  "zeitraum_von":     "2025-02-01",
  "zeitraum_bis":     "2026-01-31",
  "kwh":              1780.0,
  "energiekosten":    155.00,
  "netzgebuehren":    141.00,
  "steuern":          80.20,
  "gesamt_inkl_ust":  450.00,
  "rechnungsnummer":  "XXXXXX"
}
```

**NICHT extrahieren:** Anlagenadresse, Kundennummer, Anlagenummer, Name, Zählerstand-Details

**Regex-Muster für Verbund-PDFs (Seite 1):**
```
Rechnungsdatum:     r"Rechnungsdatum:\s*(\d{2}\.\d{2}\.\d{4})"
Abrechnungszeitraum: r"Abrechnungszeitraum:\s*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})"
Stromverbrauch:     r"Stromverbrauch:\s*([\d.,]+)\s*kWh"
Energiekosten:      r"Energiekosten\s+([\d.,]+)"
Netzgebühren:       r"Netzgeb[üu]hren.*?\s+([\d.,]+)"  (letzter Match auf Seite 1)
Steuern:            r"Steuern und Abgaben\s+([\d.,]+)"
Gesamtkosten:       r"Ihre Gesamtkosten inkl\. USt\.\s+([\d.,]+)"
Rechnungsnummer:    r"Rechnungsnummer:\s*(\S+)"
```

**Zählpunkt (Seite 2):**
```
r"Zählpunkt:\s*(AT\w+)"
```

**Wichtig bei Zahlen:** Verbund verwendet deutsches Format (`1.890,50`) → vor `float()` umwandeln:
```python
def parse_num(s): return float(s.replace('.','').replace(',','.'))
```

---

## data/*.json — Format

Die JSON-Dateien sind Arrays, neueste Einträge werden angehängt:

```json
[
  {
    "rechnungsdatum":  "2024-02-05",
    "zeitraum_von":    "2023-02-01",
    "zeitraum_bis":    "2024-01-31",
    "kwh":             1820.0,
    "energiekosten":   148.50,
    "netzgebuehren":   138.20,
    "steuern":         78.10,
    "gesamt_inkl_ust": 437.60,
    "rechnungsnummer": "RNR2024001"
  }
]
```

---

## docs/index.html — GitHub Pages Dashboard

- Bereits fertig, keine Änderungen nötig
- Liest `../data/rennweg.json` und `../data/aspangstrasse.json`
- Fällt bei fehlenden Daten automatisch auf Demo-Daten zurück
- Rennweg = Grün (#00d4aa), Aspangstraße = Orange (#ff6b35)
- Zeigt: Summary-Cards, Verbrauch-Chart, Kosten-Charts, Historien-Tabelle

**GitHub Pages aktivieren:**
→ GitHub Repo → Settings → Pages → Source: Branch `main`, Folder `/docs`

---

## .gitignore — Datenschutz

```
*.pdf
*.log
.env
data/raw/
.processed_ids.txt
__pycache__/
.DS_Store
```

PDFs landen NIE im Git-Repository. Die `data/*.json` enthalten ausschließlich
anonymisierte Zahlen und sind bedenkenlos public.

---

## Troubleshooting

**„Label nicht gefunden"**
→ `list_labels(mail)` in gmail_invoices.py einkommentieren → exakten Namen kopieren

**„Authentication failed"**
→ App-Passwort prüfen (keine Leerzeichen) · IMAP in Gmail aktiviert?

**Zählpunkt wird nicht erkannt**
→ PDF manuell öffnen, Seite 2, Zeile „Zählpunkt" → Nummer in ZAEHLPUNKTE eintragen

**Cron läuft nicht (macOS)**
→ Systemeinstellungen → Datenschutz & Sicherheit → Festplattenvollzugriff → Terminal hinzufügen

**Dashboard zeigt Demo-Daten**
→ `data/rennweg.json` und `data/aspangstrasse.json` existieren noch nicht
→ Script einmal manuell ausführen: `python3 extract_verbund.py /pfad/zur/rechnung.pdf`
