# gmail-pdf-sync

Lädt automatisch Verbund-Stromrechnungen (PDF) aus Gmail herunter, extrahiert relevante Verbrauchsdaten und zeigt sie in einem GitHub Pages Dashboard an.

**Dashboard:** [manuel-app.dev/gmail-pdf-sync](https://manuel-app.dev/gmail-pdf-sync/)

---

## Was es tut

1. Verbindet sich per IMAP mit Gmail (`manuel.rechnungen@gmail.com`)
2. Lädt PDF-Anhänge aus dem Label `Rechnungen` in iCloud Drive
3. Extrahiert Verbrauchsdaten (kWh, Kosten, Zeitraum) aus den Verbund-PDFs
4. Schreibt die Zahlen in `data/rennweg.json` und `data/aspangstrasse.json`
5. Das Dashboard liest diese JSON-Dateien und zeigt Charts + Tabellen

**Zwei Haushalte:** Rennweg · Aspangstraße (inkl. Wallbox E-Auto)

---

## Dateistruktur

```
gmail-pdf-sync/
├── gmail_invoices.py      ← PDFs aus Gmail → iCloud Download
├── extract_verbund.py     ← PDFs parsen → data/*.json
├── .env                   ← Gmail App-Passwort (nicht im Repo)
├── .env.example           ← Vorlage
├── data/
│   ├── rennweg.json       ← Verbrauchsdaten Rennweg
│   └── aspangstrasse.json ← Verbrauchsdaten Aspangstraße
└── docs/                  ← GitHub Pages Dashboard
    ├── index.html
    ├── styles.css         ← generiert via Tailwind (nicht direkt editieren)
    ├── script.js
    └── src/
        └── input.css      ← CSS-Quelle
```

---

## Setup

### 1. Abhängigkeiten installieren

```bash
pip3 install pdfplumber python-dotenv
```

### 2. `.env` anlegen

```bash
cp .env.example .env
# GMAIL_APP_PASSWORD eintragen
```

Gmail App-Passwort erstellen: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### 3. Zählpunkte eintragen

In `extract_verbund.py` die Zählpunktnummern aus Seite 2 der Verbund-Rechnung eintragen:

```python
ZAEHLPUNKTE = {
    "AT002...": "rennweg",
    "AT002...": "aspangstrasse",
}
```

### 4. Einmalig testen

```bash
python3 gmail_invoices.py
```

### 5. Cron-Job einrichten (täglich 08:00)

```
0 8 * * * /usr/bin/python3 /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.py >> /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.log 2>&1
```

> macOS: Terminal braucht Festplattenvollzugriff unter Systemeinstellungen → Datenschutz & Sicherheit.

---

## Dashboard (GitHub Pages)

Aktiviert unter: Repo → Settings → Pages → Source: Branch `main`, Folder `/docs`

CSS-Änderungen immer in `docs/src/input.css`, dann neu bauen:

```bash
cd docs && npm run build:css
```

---

## Datenschutz

PDFs und `.env` sind in `.gitignore` — sie landen nie im Repository.  
Die `data/*.json` enthalten ausschließlich anonymisierte Zahlen (kein Name, keine Adresse, keine Kundennummer).
