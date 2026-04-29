# gmail-pdf-sync · VoltMetric Pro

Lädt automatisch Verbund-Stromrechnungen (PDF) aus Gmail herunter, extrahiert relevante Verbrauchsdaten und zeigt sie in einem GitHub Pages Dashboard an.

**Dashboard:** [manuel-app.dev/gmail-pdf-sync](https://manuel-app.dev/gmail-pdf-sync/)  
**Zwei Haushalte:** Rennweg · Aspangstraße (inkl. Wallbox E-Auto)

---

## Was es tut

1. GitHub Actions läuft täglich 07:00 UTC und verbindet sich per IMAP mit Gmail
2. Lädt neue PDF-Anhänge aus dem Label `Rechnungen`
3. Extrahiert Verbrauchsdaten (kWh, Kosten, Zeitraum) aus den Verbund-PDFs
4. Schreibt die Zahlen in `data/rennweg.json` und `data/aspangstrasse.json`
5. Committet und pusht die JSON-Änderungen direkt ins Repo
6. Das Dashboard liest diese JSON-Dateien und zeigt Charts + Tabellen

---

## Dateistruktur

```
gmail-pdf-sync/
├── gmail_invoices.py      ← PDFs aus Gmail laden + extract_verbund aufrufen
├── extract_verbund.py     ← PDFs parsen → data/*.json
├── .env                   ← Gmail App-Passwort (nicht im Repo)
├── .env.example           ← Vorlage
├── data/
│   ├── rennweg.json       ← Verbrauchsdaten Rennweg (anonymisiert)
│   └── aspangstrasse.json ← Verbrauchsdaten Aspangstraße (anonymisiert)
├── docs/                  ← GitHub Pages Dashboard (VoltMetric Pro)
│   ├── index.html         ← App-Shell, alle Screens
│   ├── styles.css         ← Plain CSS Design System (direkt editierbar)
│   └── script.js          ← SPA-Logik, Charts, Firebase
└── .github/
    └── workflows/
        └── sync.yml       ← täglicher GitHub Actions Sync
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

Gmail App-Passwort: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### 3. Einmalig testen

```bash
python3 gmail_invoices.py
```

---

## Dashboard (GitHub Pages)

Aktiviert unter: Repo → Settings → Pages → Source: Branch `main`, Folder `/docs`

**CSS:** Kein Build-Step. `docs/styles.css` direkt editieren — plain CSS.

**Firebase:** Settings werden in Firestore `wallbox-manuel` unter `config/settings` gespeichert.  
Wallbox-Daten kommen aus `haushalte/haushalt.charges[]` im selben Projekt.

**Onboarding:** Beim ersten Besuch erscheint automatisch ein 6-schrittiger Wizard der neue User durch das Dashboard führt. Danach nicht mehr sichtbar. Jederzeit über Settings → „Tour wiederholen" neu starten.

**Mobile:** Alle Screens sind für < 768px optimiert. Das Billing Archive zeigt auf Mobile ein kompaktes Card-Layout statt der Desktop-Tabelle.

---

## Datenschutz

PDFs und `.env` sind in `.gitignore` — sie landen nie im Repository.  
Die `data/*.json` enthalten ausschließlich anonymisierte Zahlen (kein Name, keine Adresse, keine Kundennummer).
