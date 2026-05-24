# Roadmap

Ausstehende Aufgaben und zukünftige Features. Reihenfolge = grobe Priorität.

---

## Aufräumen (Quick Wins)

- [x] **Tailwind-Reste löschen** — `docs/package.json`, `docs/tailwind.config.js`, `docs/src/input.css` werden laut CLAUDE.md nicht mehr genutzt. `.gitignore` entsprechend gekürzt.
- [x] **Mockups archivieren** — `MOCKUP_mobile.html` und `voltmetric-preview.html` nach `docs/_archive/` verschoben.
- [x] **`requirements.txt` pinnen** — `pdfplumber==0.11.9`, `firebase-admin==7.4.0`.
- [ ] **Erste echte Rechnungen importieren** — sobald Verbund-Rechnungen im Gmail-Postfach landen, einmal manuell triggern.

---

## Phase 1 — Robustheit (Q2 2026)

### F1: Sync-Failure-Notification
Bei fehlgeschlagenem GitHub-Actions-Run automatisch Telegram-/E-Mail-/Discord-Notification. Aktuell merkt man Fehler nur durch Zufall im Actions-Log.
- GitHub Action `dawidd6/action-send-mail` oder Webhook in Telegram-Bot
- Trigger: `if: failure()` Step am Ende des Workflows

### F2: Unit-Tests für PDF-Parser
`pytest`-Suite mit anonymisierten Sample-Texten (kein PDF-Binary, nur die Text-Strings die `pdfplumber` extrahiert). Schützt vor Layout-Änderungen seitens Verbund.
- `tests/test_extract.py` mit ~5 Sample-Strings
- CI-Step `pytest` vor dem Sync-Step
- Snapshot-Tests für die `extract_fields()`-Outputs

### F3: Firestore-Security härten
Schreibrechte auf Cloud Functions / Admin SDK beschränken, Read public lassen.
- Frontend liest weiter ohne Auth (Daten sind sowieso anonymisiert)
- `extract_verbund.py` schreibt mit Service Account (hat bereits Admin-Rechte)
- Settings-Schreiben aus dem Browser braucht entweder Firebase Auth oder eine Cloud Function als Proxy

---

## Phase 2 — Mehr Datenquellen (Q3 2026)

### F4: Gas-Rechnungen integrieren
Wenn Aspangstraße/Rennweg auch Gas haben: zweiter Parser (`extract_gas.py`), zweites Daten-Schema (`data/gas_*.json`), eigener Chart-Tab im Dashboard.
- Provider abklären (Wien Energie? EVN?)
- Schema erweitern: `{ kwh_strom, kwh_gas, ... }` oder separates File
- Dashboard: Toggle „Strom / Gas / Beide"

### F5: Multi-Provider-Support
Architektur so refactoren, dass Parser pluggable sind. Aktuell ist `extract_verbund.py` Verbund-hardcoded — bei Provider-Wechsel müsste man alles umschreiben.
- `parsers/` Verzeichnis mit einem Modul pro Provider (`verbund.py`, `wien_energie.py`, ...)
- Detection per E-Mail-Absender oder PDF-Header
- Gemeinsames Schema in `parsers/base.py`

### F6: PV-Anlage / Einspeisung
Falls eine Photovoltaik-Anlage geplant ist: Einspeise-Abrechnungen parsen, im Dashboard Saldo (Verbrauch − Erzeugung) zeigen.
- Neues Feld `einspeisung_kwh`, `einspeise_verguetung_eur`
- Insights-Karte „Autarkiegrad"
- Chart: Verbrauch vs. Erzeugung pro Monat

---

## Phase 3 — Smart Features (Q4 2026)

### F7: Anomalie-Erkennung & Alerts
Bei ungewöhnlichem Verbrauch (> Schwellwert vs. 12-Monats-Schnitt) automatisch Push-Notification.
- Einfache Z-Score-Logik im Frontend oder GitHub Action
- Trigger-Schwelle in Settings konfigurierbar
- PWA Push API oder Telegram-Bot

### F8: CO₂-Footprint
Pro Rechnung CO₂-Äquivalent berechnen (kWh × Emissionsfaktor des Strommixes Österreich, evtl. provider-spezifisch wenn Ökostrom).
- Neue KPI-Card „CO₂ in kg/Jahr"
- API-Call zu z.B. APCS oder statischer Wert pro Jahr
- Vergleich zum österr. Durchschnittshaushalt

### F9: Tarif-Vergleich live
Die statische „Tarif-Simulation"-Card im Dashboard mit echten Daten füttern.
- API von durchblicker.at oder e-control.at (falls verfügbar)
- Eingabefeld: aktueller Tarif, dann automatisches Matching
- Liste der Top-3-Alternativen mit Jahres-Ersparnis-Schätzung

### F10: Mobile PWA
`docs/` als installierbare Progressive Web App.
- `manifest.json`, Service Worker für Offline-Caching der letzten Daten
- iOS „Zum Home-Bildschirm hinzufügen" als App-Icon
- Push-Benachrichtigungen bei neuen Rechnungen
