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

---

## Offen — Firestore-Regeln setzen (PFLICHT)

Damit Settings gelesen/geschrieben werden können, in der Firebase Console unter  
`wallbox-manuel` → Firestore → Rules folgendes ergänzen:

```
match /config/{doc} {
  allow read, write: if true;
}
```

---

## Offen — Zählpunkt Rennweg

- [ ] Zählpunkt Rennweg in `extract_verbund.py` eintragen
  - Steht auf Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT..."

---

## Phase 2 — Rechnungsdaten in Firestore

Aktuell werden Rechnungsdaten als statische JSON-Files ins Repo committet.  
Ziel: Python-Script schreibt direkt in Firestore, Dashboard liest von dort.

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

**Was sich ändert:**
- `extract_verbund.py` → statt JSON-File schreibt es per Firebase Admin SDK in Firestore
- `script.js` → `loadData()` liest aus Firestore statt `fetch("../data/*.json")`
- `data/*.json` als Fallback im Repo behalten (GitHub Actions schreibt sie weiterhin parallel)
- GitHub Actions: `firebase-admin` installieren, Service Account Key als Secret hinterlegen

**Schritte:**
- [ ] Firebase Admin SDK in `extract_verbund.py` integrieren
- [ ] Service Account Key als GitHub Secret `FIREBASE_SERVICE_ACCOUNT` anlegen
- [ ] `loadData()` in `script.js` auf Firestore umstellen (mit JSON-Fallback)
- [ ] Firestore-Regel für `invoices/` ergänzen
- [ ] Bestehende Rechnungen einmalig in Firestore importieren

---

## Phase 3 — Firebase Auth (optional)

Wenn das Dashboard jemals öffentlich oder multi-user werden soll:

- [ ] Firebase Auth aktivieren (Google Login)
- [ ] Firestore-Regeln von `if true` auf `if request.auth != null` ändern
- [ ] Login-Screen in `index.html` ergänzen
