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
├── README.md                  ← öffentliche Dokumentation
├── TODO.md                    ← offene Punkte + Roadmap
├── gmail_invoices.py          ← PDFs aus Gmail → iCloud Download
├── extract_verbund.py         ← PDFs parsen → data/*.json
├── .env                       ← GMAIL_APP_PASSWORD (nicht im Repo)
├── .env.example               ← Vorlage (im Repo)
├── data/
│   ├── rennweg.json           ← nur Zahlen, kein Datenschutz-relevantes Material
│   └── aspangstrasse.json
└── docs/
    ├── index.html             ← GitHub Pages Dashboard (App-Shell)
    ├── styles.css             ← Plain CSS Design System (direkt editierbar, kein Build!)
    └── script.js              ← SPA-Logik, Charts, Firebase
```

---

## Setup (einmalig, beim ersten Start ausführen)

```bash
# 1. Python-Abhängigkeiten
pip3 install pdfplumber python-dotenv

# 2. .env anlegen
cp .env.example .env
# GMAIL_APP_PASSWORD eintragen (myaccount.google.com/apppasswords)

# 3. Einmalig testen
python3 ~/Developer/gmail-pdf-sync/gmail_invoices.py
```

Der tägliche Sync läuft via GitHub Actions (`.github/workflows/sync.yml`, 07:00 UTC).

---

## Zählpunkte (beide eingetragen ✓)

Die Zählpunktnummern stehen auf Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT...".
Beide Nummern sind in `extract_verbund.py` unter `ZAEHLPUNKTE` eingetragen:

```python
ZAEHLPUNKTE = {
    "AT0010000000000000001000015277856": "rennweg",
    "AT0010000000000000001000015183029": "aspangstrasse",
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
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")  # aus .env laden
GMAIL_LABEL        = "Rechnungen"
ICLOUD_BASE        = Path("/Users/manuel/Documents/11_Developer/gmail-pdf-sync/invoices")
```

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

---

## CSS Build

**Kein Build-Step.** `docs/styles.css` direkt editieren — es ist plain CSS.
Tailwind und `docs/src/input.css` sind nicht mehr in Verwendung.

---

## docs/ — GitHub Pages Dashboard (VoltMetric Pro)

- Frontend ist in `index.html`, `styles.css` und `script.js` aufgeteilt
- Liest `../data/rennweg.json` und `../data/aspangstrasse.json`
- Fällt bei fehlenden Daten automatisch auf Demo-Daten zurück
- **Farbpalette (VoltMetric Pro):**
  - Teal `#00C2A8` = Rennweg
  - Amber `#F59E0B` = Aspangstraße
  - Ink `#0D1B2E` / Text `#0F172A`
  - Hero-Gradient: `#003D35 → #007A6A`
  - Sidebar: `#111827` (dunkel)
- **Fonts:** Plus Jakarta Sans (alles), IBM Plex Mono (Zahlen)
- **Screens:** Overview · Insights · Billing Archive · Settings

**Overview Layout (CSS Grid, 2 Spalten):**
```
┌─────────────────────────────────────────┐
│  hero-row  (1/-1): HeroCard · RW · AS   │
├─────────────────────────┬───────────────┤
│  kpi-grid (col 1, row 2)│  right-panel  │
├─────────────────────────┤  (col 2,      │
│  charts-row (col 1,     │   rows 2+3)   │
│   row 3): 2 Charts      │  Insights +   │
│                         │  Tarif        │
├─────────────────────────┴───────────────┤
│  bottom-row (1/-1): recentLogs ·        │
│  kostenVergleich · topKennzahlen        │
└─────────────────────────────────────────┘
```
`renderOverview()` befüllt: `#heroCard`, `#rwCard`, `#asCard`, `#kpiGrid`, `#recentLogs`, `#kostenVergleich`, `#topKennzahlen`  
Right-Panel (Insights + Tarif-Simulation) ist statisches HTML in `index.html`.

**Mobile Layout:**
- Unter 768px zeigt Overview die Mobile Glance View (kein Chart)
- Alle anderen Tabs zeigen Desktop-Layout via `body.m-desktop-screen`
- Navigation: `#mobileBottomNav` (fixierte Tab-Bar unten)

**GitHub Pages aktivieren:**
→ GitHub Repo → Settings → Pages → Source: Branch `main`, Folder `/docs`

---

## script.js — Architektur & Performance-Regeln

### State-Struktur
```js
const state = {
  activeScreen: "overview",   // gespeichert in localStorage
  charts: {},                 // Map: canvasId → Chart-Instanz (KEIN Array!)
  data: null,                 // geladen via loadData()
  wallbox: { byMonth, byYear },
  computed: {
    yearly: null,             // buildYearBuckets() — einmalig nach loadData()
    monthly: null,            // buildMonthlySeries() — einmalig nach loadData()
  },
  archive: { search, year, location },
  settings: { ... },          // geladen via loadSettings() aus Firestore
};
```

### Firebase / Firestore

**Projekt:** `wallbox-manuel`  
**Helper:** `getFirestoreDb()` — initialisiert die Firebase-App einmalig und gibt `db` zurück.
Wird von `loadWallboxData()`, `loadSettings()` und `saveSettings()` verwendet.

**Collections:**
```
wallbox-manuel/
  haushalte/haushalt          ← Wallbox-Ladedaten (charges[])
  config/settings             ← Dashboard-Einstellungen (ein Dokument)
```

**Settings-Strategie (Firestore-first):**
- `loadSettings()`: liest localStorage als sofortigen Seed, überschreibt dann mit Firestore
- `saveSettings()`: schreibt localStorage sofort, dann Firestore async
- Notice im UI zeigt "Firestore · HH:MM" oder "Lokal · HH:MM" je nach Ergebnis

**⚠ Firestore-Regeln müssen gesetzt sein:**
Firebase Console → `wallbox-manuel` → Firestore → Rules:
```
match /config/{doc} {
  allow read, write: if true;
}
```

### Wichtige Performance-Regeln

**Charts NICHT destroy/recreate bei Tab-Wechsel:**
`state.charts` ist ein Objekt keyed by `canvasId`.
`createChart(canvasId, config)` prüft ob Instanz existiert:
- Existiert → `chart.data = config.data; chart.update("none")` (kein Flackern)
- Existiert nicht → neu erstellen und speichern

**Charts lazy via ResizeObserver initialisieren:**
`renderChartWhenVisible(canvasId, renderFn)` wartet bis `contentRect.width > 0`
bevor `renderFn()` aufgerufen wird. Nie direkt `renderOverviewCharts()` oder
`renderDetailCharts()` aufrufen — immer über `renderChartWhenVisible()`.

**DOM-Selektoren cachen:**
`domCache.screens` und `domCache.navButtons` werden einmalig in `attachEvents()`
befüllt. In `activateScreen()` diese gecachten Arrays verwenden.

**Berechnungen cachen:**
`buildYearBuckets()` und `buildMonthlySeries()` laufen einmalig in `init()`
und werden in `state.computed` gespeichert.

### Mobile Canvas-Sichtbarkeit
```css
canvas { display: none !important; }                         /* Glance-Modus */
body.m-desktop-screen canvas { display: block !important; }  /* Insights etc. */
```
`body.m-desktop-screen` wird gesetzt wenn `activeScreen !== "overview"`.

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

**Dashboard zeigt Demo-Daten**
→ `data/rennweg.json` und `data/aspangstrasse.json` existieren noch nicht
→ Script einmal manuell ausführen: `python3 extract_verbund.py /pfad/zur/rechnung.pdf`

**Settings werden nicht in Firestore gespeichert**
→ Firestore-Regeln für `config/{doc}` prüfen (siehe oben)
→ Browser-Console auf Firebase-Fehler prüfen

**Charts in Insights auf Mobile leer**
→ Sicherstellen dass `body.m-desktop-screen canvas { display: block !important }` in `styles.css` steht

**CSS-Änderung hat keinen Effekt**
→ `styles.css` ist plain CSS und wird direkt editiert — kein Build nötig
→ Browser-Cache leeren (Cmd+Shift+R)

**Chart zeigt alte Daten nach Data-Reload**
→ Nach `loadData()` muss `destroyCharts()` aufgerufen werden und `state.computed` neu befüllt werden
→ `state.computed.yearly = buildYearBuckets(state.data.entries)`
→ `state.computed.monthly = buildMonthlySeries(state.data)`
