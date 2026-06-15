# gmail-pdf-sync — Offene Punkte

## Erledigt

- [x] App-Passwort aus Hardcode in `.env` ausgelagert (python-dotenv)
- [x] Cron-Job → ersetzt durch GitHub Actions (`.github/workflows/sync.yml`, täglich 07:00 UTC)
- [x] GitHub Actions: `python-dotenv` entfernt, JSON-Änderungen werden automatisch committet + gepusht
- [x] GitHub Secret `GMAIL_APP_PASSWORD` hinterlegt, erster Workflow-Run erfolgreich (2026-04-23)
- [x] GitHub Repo erstellt → https://github.com/ieeks/gmail-pdf-sync
- [x] GitHub Pages aktiviert → https://manuel-app.dev/gmail-pdf-sync/
- [x] Zählpunkt Aspangstraße eingetragen: `AT0010000000000000001000015183029`
- [x] Zählpunkt Rennweg eingetragen: `AT0010000000000000001000015277856`
- [x] Dashboard: `index.html` + `styles.css` + `script.js` aufgeteilt
- [x] **VoltMetric Pro Redesign** — komplettes Redesign auf VoltMetric Pro Design System
  - Plain CSS (kein Tailwind, kein Build-Step mehr)
  - Teal `#00C2A8` = Rennweg, Amber `#F59E0B` = Aspangstraße
  - IBM Plex Mono für Zahlen, Plus Jakarta Sans für Headings
  - Hero-Card, Snapshot-Rail, KPI-Grid, Charts, Archive-Tabelle, Modal
  - Mobile Glance Mode, fixierte Bottom-Nav
- [x] **Firebase Settings** — Settings von localStorage auf Firestore migriert
  - Firestore: `wallbox-manuel` / `config/settings`
  - Firestore-first mit localStorage als schnellem Cache
  - Settings-Notice zeigt "Firestore · HH:MM" oder "Lokal · HH:MM"

- [x] **Firestore-Regeln gesetzt** — `haushalte/`, `config/`, `invoices/` alle auf `allow read, write: if true`
- [x] **Onboarding Wizard** (2026-04-29) — 6-schrittiger Modal-Overlay für neue User
  - Erscheint beim ersten Besuch automatisch (`localStorage: voltmetric-onboarding-done`)
  - Steps: Willkommen · Overview · Insights (inkl. Wallbox) · Billing Archive · Automatik · Fertig
  - ESC schließt ohne zu persistieren, „Tour wiederholen" Button in Settings
- [x] **Archive Mobile Fix** (2026-04-29) — Card-Layout statt 7-Spalten-Grid auf < 768px
  - Header ausgeblendet, Row wird flex-column Card
  - Zeile 1: Rechnungsnummer + Location Badge; Zeile 2: Zeitraum; Zeile 3: kWh · Energy · Total

- [x] **VoltMetric Pro → Production** — Preview auf `docs/` migriert (2026-04-25)
  - Dunkle Sidebar `#111827`, neues CSS Design System (tokens, shadows, radius vars)
  - Overview: CSS Grid mit Hero-Row, KPI-Grid, Right-Panel (statisch), Charts-Row, Bottom-Row
  - `renderOverview()` neu: füllt heroCard, rwCard, asCard, kpiGrid, recentLogs, kostenVergleich, topKennzahlen
  - `daysAgo()` helper, Event-Delegation für dynamisch gerenderte Elemente
  - `voltmetric-preview.html` als Design-Referenz im Repo behalten (jetzt in `docs/_archive/`)

- [x] **Wallbox periodengenau** (2026-06-15, PR #7 + #8) — erste echte Rechnungen validiert + Wallbox-Logik korrigiert
  - **Datenvalidierung:** beide echten Verbund-Rechnungen 1:1 korrekt im Tool; Tarif V-Strom ÖSTERREICH (15 ct/kWh inkl. USt., 4,79 €/Mon Grundpreis, −3,6 ct/kWh Rabatt) stimmt exakt mit den Rechnungen
  - **Bug 1 — Wallbox-Prozent zeigte 100 %:** `/12` aus altem Jahresrechnungs-Modell entfernt (Rechnungen sind monatlich); Anteil jetzt periodengenau auf den Abrechnungszeitraum bezogen
  - Wallbox-Card trennt **„abgerechnet"** (mit %) und **„laufend, noch nicht abgerechnet"** (absolute kWh + Anzahl Ladungen, ohne %)
  - **Bug 2 — Consumption Runway widersprüchlich** (Wallbox > Gesamt, Haushalt 0, Phantom-April): eine Rechnung gehört jetzt zu genau einem Monat (`representativeMonth`, kein Verschmieren über Kalendermonate); Wallbox überall nur innerhalb der Abrechnungszeiträume (`wallboxKwhInPeriod` → `aspangWallboxKwh`) in `buildMonthlySeries`, `buildYearBuckets`, Insights- und Overview-Chart sowie KPI-Kachel
  - Vorvertragliche Wallbox-Ladungen (alter Anbieter, Jahresvertrag, April) bleiben überall außen vor
  - Neue Helfer: `wallboxKwhInPeriod()`, `wallboxUnbilled()`, `representativeMonth()`; `loadWallboxData()` liefert zusätzlich rohe `charges[]`; ungenutzte `eachMonthBetween` entfernt

---

## Phase 2 — Rechnungsdaten in Firestore ✓

Rechnungsdaten werden nun parallel in `data/*.json` und Firestore gespeichert.  
Das Dashboard liest Firestore-first, fällt auf JSON-Dateien zurück.

**Firestore-Struktur:**
```
wallbox-manuel/
  invoices/{rechnungsnummer}   ← ein Dokument pro Rechnung
    location: "rennweg" | "aspangstrasse"
    rechnungsdatum: "2026-02-04"
    zeitraum_von: "2025-02-01"
    zeitraum_bis: "2026-01-31"
    kwh: 1780
    energiekosten: 242.20
    netzgebuehren: 141.70
    steuern: 86.60
    gesamt_inkl_ust: 470.50
    rechnungsnummer: "VR-RW-2026-0204"
```

**Erledigte Schritte:**
- [x] Firebase Admin SDK in `extract_verbund.py` integriert (`get_firestore_db()` helper)
- [x] `firebase-admin` in `requirements.txt` ergänzt
- [x] Service Account Key als GitHub Secret `FIREBASE_SERVICE_ACCOUNT` hinterlegt
- [x] `sync.yml` übergibt `FIREBASE_SERVICE_ACCOUNT` an den Sync-Schritt
- [x] `loadData()` in `script.js` auf Firestore-first umgestellt (mit JSON-Fallback)

**Noch offen:**
- [x] Firestore-Regel für `invoices/` gesetzt (`allow read, write: if true`)
- [ ] Bestehende Rechnungen einmalig in Firestore importieren (falls vorhanden)

---

## Phase 3 — Firebase Auth (optional)

Wenn das Dashboard jemals öffentlich oder multi-user werden soll:

- [ ] Firebase Auth aktivieren (Google Login)
- [ ] Firestore-Regeln von `if true` auf `if request.auth != null` ändern
- [ ] Login-Screen in `index.html` ergänzen

---

## Rechnungs-Anzeige im Archive

### Option C — generierte Ansicht ✓ (2026-06-15)

- [x] Faux-PDF-Platzhalter im Modal durch echte, datengetriebene Rechnungs-Ansicht ersetzt
  (`invoiceCardHtml()` / `buildModalPreview()` in `script.js`, `.gen-invoice` in `styles.css`)
- [x] „Download"-Button öffnet die Ansicht in einem eigenen Fenster und ruft den Druckdialog auf
  (`printInvoice()` → Browser „Als PDF speichern")
- [x] Zeigt nur anonymisierte Zahlen — keine personenbezogenen Daten, kein Datenschutz-Risiko

### Option A — Original-PDF anzeigen (Firestore-Base64, kein Storage/Blaze)

Ziel: das **echte** Verbund-PDF im Modal anzeigen. Das PDF wird Base64-kodiert in
Firestore (`invoice_pdfs/{rechnungsnummer}`) abgelegt — **kein Firebase Storage,
kein Blaze-Plan nötig**, nur der vorhandene Spark-Plan. Public bleibt Option C; nur
eingeloggt (berechtigter Account) erscheint zusätzlich das Original-PDF.

Limit: Firestore-Dokument max. 1 MiB → Roh-PDF bis ~750 KB (Base64 +33 %). Verbund-PDFs
(100–400 KB) passen problemlos; größere werden übersprungen.

**Code — erledigt (2026-06-15):**
- [x] PDF Base64 in Firestore `invoice_pdfs/{rechnungsnummer}` (`store_pdf_in_firestore()` in `extract_verbund.py`)
- [x] Invoice-Dokument bekommt `hasPdf: true` (nur Firestore, nicht in `data/*.json`)
- [x] `hasPdf` durch `normalizeEntries()` ins Frontend durchgereicht
- [x] Firebase Auth (Google) im Dashboard: `getAuth()`, `initAuth()`, `signIn()`,
  `signOutUser()`, Zugriff auf `ALLOWED_EMAILS` beschränkt
- [x] PDF-Anzeige im Modal: Firestore-Doc → Base64 → Blob → Object-URL → `<iframe>`
  (`showInvoicePdf()`, `base64ToBlob()`); Object-URL wird wieder freigegeben (`revokePdfUrl()`)
- [x] Button nur sichtbar wenn `hasPdf` vorhanden → graceful Fallback auf C
- [x] `firebase-auth-compat` SDK in `index.html` (Storage-SDK nicht nötig)
- [x] `firestore.rules` als Source of Truth im Repo (`invoice_pdfs` privat)
- [x] `.gitignore` (`*.pdf`) bleibt — PDFs liegen nur privat in Firestore, nie im Git

**Manuell in der Firebase Console (einmalig, danach läuft alles):**
- [ ] **Authentication → Google-Provider aktivieren**
- [ ] **Authorized domains:** `manuel-app.dev` hinzufügen
- [ ] **Firestore-Regeln deployen** — `firebase deploy --only firestore:rules` (nutzt `firestore.rules`)
  oder Regeln aus `firestore.rules` in der Console einfügen (wichtig: `invoice_pdfs` privat!)
- [ ] Erlaubte Accounts: `manuel.koblischek@gmail.com`, `zolguita@gmail.com`
  (in `ALLOWED_EMAILS` in `script.js` **und** in `firestore.rules` gepflegt — bei Änderung beide anpassen)
- [ ] Bereits vorhandene PDFs einmalig neu durch `extract_verbund.py` laufen lassen,
  damit `hasPdf` + `invoice_pdfs` gesetzt werden (oder beim nächsten Sync automatisch)

> Kein Firebase Storage und kein Blaze-Plan nötig — alles im kostenlosen Spark-Plan.
