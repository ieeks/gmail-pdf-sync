# gmail-pdf-sync — Offene Punkte

## Wartet auf Verbund-Rechnung (in ein paar Wochen)

- [x] **Zählpunkt Aspangstraße** eingetragen: `AT0010000000000000001000015183029`
- [ ] **Zählpunkt Rennweg** noch ausstehend — steht auf Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT..."

## Einmalig einrichten

- [x] **App-Passwort** aus Hardcode in `.env` ausgelagert (python-dotenv)
- [x] **Cron-Job** → ersetzt durch GitHub Actions (`.github/workflows/sync.yml`, täglich 07:00 UTC)
- [x] **GitHub Actions Migration**: `python-dotenv` entfernt, PDFs temporär im Runner, JSON-Änderungen werden automatisch committet + gepusht
- [x] **GitHub Secret** `GMAIL_APP_PASSWORD` hinterlegt, erster Workflow-Run erfolgreich (2026-04-23)

- [x] **GitHub Repo** erstellen und pushen → https://github.com/ieeks/gmail-pdf-sync
- [x] **GitHub Pages** aktivieren → https://manuel-app.dev/gmail-pdf-sync/

## Dashboard / Frontend

- [x] Dashboard aus `single html` auf `index.html`, `styles.css`, `script.js` aufgeteilt
- [x] Farbwelt auf `Volt & Grid`-Palette umgestellt
- [x] Summary-Cards, Charts, Typo und Tabelle visuell verfeinert
- [ ] Optional: weiterer Feinschliff an Hero und Karten nur in kleinen Schritten, kein Full Redesign ohne neuen Review

## Erster Test (nach Zählpunkten)

```bash
python3 /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.py
```
