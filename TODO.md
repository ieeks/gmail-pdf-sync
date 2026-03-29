# gmail-pdf-sync — Offene Punkte

## Wartet auf Verbund-Rechnung (in ein paar Wochen)

- [ ] **Zählpunktnummern eintragen** in `extract_verbund.py`
  - Seite 2 der Verbund-Rechnung, Zeile „Zählpunkt: AT002..."
  - Beide Nummern (Rennweg + Aspangstraße) eintragen:
    ```python
    ZAEHLPUNKTE = {
        "AT002...": "rennweg",
        "AT002...": "aspangstrasse",
    }
    ```

## Einmalig einrichten

- [ ] **Cron-Job** einrichten (täglich 08:00):
  ```
  crontab -e
  ```
  Folgende Zeile einfügen:
  ```
  0 8 * * * /usr/bin/python3 /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.py >> /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.log 2>&1
  ```

- [ ] **GitHub Repo** erstellen und pushen
- [ ] **GitHub Pages** aktivieren: Repo → Settings → Pages → Branch `main`, Folder `/docs`

## Erster Test (nach Zählpunkten)

```bash
python3 /Users/manuel/Developer/gmail-pdf-sync/gmail_invoices.py
```
