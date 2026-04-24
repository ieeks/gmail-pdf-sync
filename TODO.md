# gmail-pdf-sync — Offene Punkte

## Erledigt

- [x] App-Passwort aus Hardcode in `.env` ausgelagert (python-dotenv)
- [x] Cron-Job → ersetzt durch GitHub Actions (`.github/workflows/sync.yml`, täglich 07:00 UTC)
- [x] GitHub Actions: `python-dotenv` entfernt, JSON-Änderungen werden automatisch committet + gepusht
- [x] GitHub Secret `GMAIL_APP_PASSWORD` hinterlegt, erster Workflow-Run erfolgreich (2026-04-23)
- [x] GitHub Repo erstellt → https://github.com/ieeks/gmail-pdf-sync
- [x] GitHub Pages aktiviert → https://manuel-app.dev/gmail-pdf-sync/
- [x] Zählpunkt Aspangstraße eingetragen: `AT0010000000000000001000015183029`
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

---

---

## Offen — Zählpunkt Rennweg

- [ ] Zählpunkt Rennweg in `extract_verbund.py` eintragen
  - Steht auf Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT..."

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
