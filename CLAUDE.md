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

**⚠ Das Postfach wird geteilt.** `manuel.rechnungen@gmail.com` versorgt auch das
**finance-dashboard**, das hunderte Fremdrechnungen im selben Label `Rechnungen`
verarbeitet und dabei `UNSEEN` als Warteschlange verwendet. Daraus folgen zwei
harte Regeln für dieses Skript:

1. **Read-only.** `mail.select(..., readonly=True)`, Vollabruf per `BODY.PEEK[]`
   statt `RFC822` (das setzt serverseitig `\Seen`), kein `mail.store`. Würde der
   Sync Mails als gelesen markieren, verschwänden sie aus der Warteschlange des
   finance-dashboards, bevor es sie gesehen hat.
   Schalter: `MARK_AS_READ = False` — nicht ändern, solange das Postfach geteilt ist.
2. **Kein `UNSEEN` als Suchkriterium.** Das finance-dashboard markiert Mails
   selbst als gelesen; je nachdem wer zuerst läuft, wäre die Verbund-Rechnung
   sonst schon `Seen` und würde nie gefunden. Gesucht wird stattdessen über ein
   Zeitfenster: `SINCE <heute − LOOKBACK_DAYS>` (Standard 14 Tage).

**Was es tut:**
- Verbindet sich per IMAP mit Gmail (manuel.rechnungen@gmail.com), read-only
- Durchsucht die letzten `LOOKBACK_DAYS` Tage im Label (nicht `UNSEEN`)
- Sortiert vor, ohne Mails zu laden (siehe unten) — spart hunderte Downloads
- Lädt die PDF-Anhänge der verbliebenen Mails per `BODY.PEEK[]` herunter
- Benennt um: `YYYY-MM-DD_Absender_Originalname.pdf`
- Ruft `extract_verbund.py` für jedes PDF auf
- Verändert **nichts** am Postfach

**Zweistufige Erkennung.** Der Betreff allein taugt nicht (die Aspang-Rechnung
„rechnung aspang juli 2026" wurde deshalb monatelang verworfen), ein Vollabruf
aller Mails aber auch nicht — dafür liegen zu viele Fremdrechnungen im Label.
Deshalb:

*Stufe 1 — Vorfilter (`looks_like_verbund()`, ohne Download).* Nur Kopfzeilen und
`BODYSTRUCTURE`. Mehrere unabhängige Signale, ODER-verknüpft:
- Absender oder Betreff enthält „verbund" / „energierechnung" — greift bei der
  Original-Mail von VERBUND („Ihre Energierechnung ist da!", `@verbund.at`) und
  auch bei Weiterleitungen („WG: …")
- Dateiname des Anhangs im Verbund-Schema
  `<Kund:innen-Nr>_<Anlagen-Nr>_<Datum>_<Rechnungs-Nr>_<Monat>_<Jahr>_R_<Nr>.pdf`
  (`RE_VERBUND_ATTACHMENT`) — greift auch bei selbst getipptem Betreff
- Absender ist das Postfach selbst (`SELF_SENT_IS_VERBUND`) — dann sind Betreff
  *und* Dateiname egal. Deckt den Portal-Download ab, den man sich selbst schickt;
  die Fremdrechnungen des finance-dashboards kommen von externen Absendern

*Stufe 2 — Inhalt entscheidet.* Erst `extract_verbund.py` bestimmt am **Zählpunkt
auf Seite 2**, ob es wirklich eine Verbund-Rechnung ist und zu welchem Haushalt
sie gehört. Der Vorfilter spart nur Downloads, er trifft keine Zuordnung.

**Exit-Codes von `extract_verbund.py`:**

| Exit | Bedeutung |
|------|-----------|
| `0` | Rechnung neu übernommen |
| `1` | Verbund-Rechnung, aber Extraktion fehlgeschlagen (z. B. unbekannter Zählpunkt) |
| `2` | keine Verbund-Rechnung (kein Zählpunkt, kein „Verbund" im Text) |
| `3` | Verbund-Rechnung, war aber schon bekannt (Duplikat) |

Ohne `\Seen`-Flag sieht der Sync dieselbe Mail bis zu `LOOKBACK_DAYS` lang erneut.
Das ist unkritisch — Duplikate fängt der Rechnungsnummern-Check ab (Exit `3`), und
ein bereits vollständiges Firestore-Dokument (`hasPdf`) wird nicht neu geschrieben.

**Rechnungen älter als `LOOKBACK_DAYS`** werden nicht mehr gefunden. Nachtragen
von Hand: `python3 extract_verbund.py /pfad/zur/rechnung.pdf`

**Bevorzugter Weg, wie Rechnungen ins Postfach kommen:** VERBUND verschickt die
Rechnung selbst als E-Mail mit PDF-Anhang. Am robustesten ist es, in *Mein VERBUND*
`manuel.rechnungen@gmail.com` als Rechnungsadresse zu hinterlegen — dann trägt die
Mail Absender `@verbund.at` und einen sprechenden Betreff. Portal-Download mit
selbst getipptem Betreff funktioniert dank Dateinamen-Signal ebenfalls, ist aber
die fragilste Variante.

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
│                         │  topKennzahlen│
├─────────────────────────┴───────────────┤
│  bottom-row (1/-1): recentLogs ·        │
│  kostenVergleich · Kostenaufschlüsselung│
└─────────────────────────────────────────┘
```
`renderOverview()` befüllt: `#heroCard`, `#rwCard`, `#asCard`, `#kpiGrid`, `#recentLogs`, `#kostenVergleich`, `#topKennzahlen`, `#insightsList`, `#kostenAufschluesselung`  
Right-Panel hat `#insightsList` (dynamisch via `renderInsights()`) + `#topKennzahlen` (dynamisch).  
`#kostenAufschluesselung` (Bottom-Row) zeigt via `renderKostenAufschluesselung()` die Aufteilung Energie / Netz / Steuern der letzten Rechnung beider Standorte — alles aus echten Daten, kein statisches HTML mehr (die frühere Tarif-Simulation war eine erfundene Nachttarif-Ersparnis und wurde entfernt).

**Mobile Layout:**
- Unter 768px zeigt Overview die Mobile Glance View (kein Chart)
- Alle anderen Tabs zeigen Desktop-Layout via `body.m-desktop-screen`
- Navigation: `#mobileBottomNav` (fixierte Tab-Bar unten)
- **Billing Archive auf Mobile:** Card-Layout statt 7-Spalten-Grid
  - `.archive-table-head` ausgeblendet
  - `.archive-table-row` wird `flex-direction: column` Card
  - `.archive-card-top`: Rechnungsnummer links, Location Badge rechts
  - `.archive-card-numbers`: kWh · Energiekosten · Gesamt in einer Zeile
  - `.btn-pdf` (Open-Button) auf Mobile ausgeblendet

**GitHub Pages aktivieren:**
→ GitHub Repo → Settings → Pages → Source: Branch `main`, Folder `/docs`

---

## Onboarding Wizard

Beim ersten Besuch erscheint automatisch ein 6-schrittiger Modal-Overlay.

**localStorage-Key:** `voltmetric-onboarding-done`  
Nicht in `STORAGE_KEYS` eingetragen — eigene Konstante `ONBOARDING_KEY`.

**Trigger:** `initOnboarding()` wird am Ende von `init()` nach `renderApp()` aufgerufen.

**6 Schritte:**
1. Willkommen — Projekt-Intro, Badge „Keine App nötig"
2. Overview — KPIs, Hero Cards, Charts
3. Insights — 18-Monats-Trends inkl. Wallbox-Daten
4. Billing Archive — filterbares Rechnungsarchiv
5. Automatik — Gmail-Sync + Wallbox-Import täglich 07:00 Uhr (Info-Box)
6. Fertig — Abschluss, setzt `localStorage`

**Funktionen:**
- `showOnboarding()` — setzt Step 0, zeigt Overlay mit Fade-In
- `hideOnboarding()` — Fade-Out, dann `display:none` via `transitionend`
- `completeOnboarding()` — setzt localStorage + hideOnboarding
- `renderOnboardingStep(step)` — befüllt DOM, Progress Dots, Prev/Next Handler
- `initOnboarding()` — registriert ESC-Handler, zeigt Wizard wenn Key fehlt

**ESC:** Schließt Modal OHNE localStorage zu setzen → erscheint beim nächsten Besuch wieder.

**„Tour wiederholen":** Button in Settings (statisches HTML, `prototype-note` Panel):
```js
localStorage.removeItem('voltmetric-onboarding-done'); showOnboarding();
```

**Neu testen:** In DevTools Console `localStorage.removeItem('voltmetric-onboarding-done')` → Reload.

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

**Rechnung liegt im Postfach, taucht aber nicht im Log auf**
→ Älter als `LOOKBACK_DAYS`? Dann von Hand nachtragen (siehe oben).
→ Sonst am Vorfilter gescheitert: Betreff/Absender ohne „verbund"/„energierechnung",
   Anhang nicht im Verbund-Dateinamen-Schema (z. B. umbenanntes PDF) *und* von einer
   fremden Adresse geschickt (nicht von `GMAIL_USER` selbst).
   Log-Zeile „N als fremde Rechnung übersprungen" zeigt, wie viele es traf.
   Schnellste Abhilfe: Mail mit „Verbund" im Betreff nochmal senden.

**Log sagt „Übersprungen (kein Verbund)"**
→ Veraltete Version: der alte Betreff-Filter (`VERBUND_KEYWORDS`) prüfte nur
   Betreff und Absender und verwarf alles andere. `gmail_invoices.py` aktualisieren.

**Rechnungen fehlen plötzlich im finance-dashboard**
→ Prüfen, ob `MARK_AS_READ` in `gmail_invoices.py` auf `True` steht oder irgendwo
   `mail.store(..., "\\Seen")` aufgerufen wird. Dieses Skript muss read-only bleiben.

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

**Archive auf Mobile zeigt 7-Spalten-Tabelle statt Cards**
→ Browser-Cache leeren (Cmd+Shift+R) — `@media (max-width:767px)` Block in `styles.css` prüfen
→ `.archive-table-head { display:none }` und `.archive-table-row { display:flex; flex-direction:column }` müssen greifen

**Onboarding erscheint nicht beim ersten Besuch**
→ `localStorage.getItem('voltmetric-onboarding-done')` in DevTools prüfen — falls gesetzt: `removeItem` + Reload
→ `initOnboarding()` wird am Ende von `init()` aufgerufen — Console auf JS-Fehler prüfen

**Onboarding erscheint immer wieder obwohl abgeschlossen**
→ `localStorage.setItem('voltmetric-onboarding-done', 'true')` wird in `completeOnboarding()` gesetzt
→ Sicherstellen dass der „Dashboard öffnen"-Button auf Step 5 `completeOnboarding()` aufruft

---

## smartmeter/ — Wiener-Netze Smart-Meter Sync (eigenständiges Modul)

Optionales Zusatzmodul: zieht täglich die **15-Minuten-Verbrauchswerte** aus dem
Wiener-Netze-Smart-Meter über die **offizielle WSTW-API** (`wiener-netze-smart-meter-api`)
und schreibt sie nach Firestore. Komplett getrennt vom PDF/Gmail-Pfad — bricht nichts
am bestehenden Sync.

```
smartmeter/
├── scripts/login_probe.py          ← Credential-Test (ZUERST ausführen)
├── scripts/smartmeter_importer.py  ← Hauptjob (readings + daily, idempotent)
├── requirements.txt                ← eigene Deps (google-cloud-firestore, dotenv)
├── .env.example
└── README.md                       ← Setup, Secrets, Stolpersteine
```

- Eigener Workflow: `.github/workflows/smartmeter-sync.yml` (Cron 06:15 UTC).
  **NICHT** dieselbe Datei wie der Gmail-Sync (`sync.yml`).
- Firestore-Collections: `smartmeter_readings/<zp>_<iso-ts>` (15 min) und
  `smartmeter_daily/<zp>_<YYYY-MM-DD>` (Tagessumme). Eigene Collections, kollidiert
  nicht mit `haushalte/` oder `config/`.
- Voraussetzung: offizielle API-Credentials (~1–2 Wochen Freischaltzeit) + Opt-in
  für Viertelstundenwerte. Details in `smartmeter/README.md`.
- Dashboard-Anbindung (`smartmeter_daily` → VoltMetric Insights) ist ein **separater
  Task** und noch nicht umgesetzt.
