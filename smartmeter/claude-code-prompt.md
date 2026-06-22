# Claude Code Auftrag: Wiener Netze Smart Meter -> Firestore Sync

Headless Sync-Job: zieht taeglich die Stromverbrauchsdaten aus dem Wiener-Netze-
Smart-Meter und schreibt sie nach Firestore. GitHub-Actions-Cron, kein Server,
kostenfrei. Stil wie meine bestehenden Projekte (VoltMetric / finance-dashboard).

## WICHTIG: Wir nehmen die OFFIZIELLE API, nicht den Web-Login

Hintergrund: Wiener Netze hat den Keycloak-Login auf PKCE umgestellt -> die
web-login-basierten Wrapper (vienna-smartmeter / DarwinsBuddy HA-Integration)
brechen regelmaessig und brauchen den PKCE-Fix (PR #309) bzw. einen ablaufenden
Cookie. Das wollen wir NICHT in einem unbeaufsichtigten Cron.

Stattdessen: offizieller Endpunkt der Wiener Stadtwerke via `wiener-netze-smart-meter-api`
(WNAPIClient). Stabil, kein Login-Scraping, kein Cookie/PKCE.

    pip install wiener-netze-smart-meter-api

### Einmalige Voraussetzung (Lead-Zeit ~1-2 Wochen!)

1. Account am WSTW Developer-Portal: https://api-portal.wienerstadtwerke.at/
2. Application fuer `WN_SMART_METER_API` anlegen.
3. Nach Freischaltung: **API-key** in den Application-Details.
4. E-Mail an support.sm-portal@wienit.at, um die App mit dem Smart-Meter-Portal-User
   zu verknuepfen (Applikationsname + SM-Portal-E-Mail angeben). Dauert 1-2 Wochen.
5. Danach: **client-id** und **client-secret** in den Einstellungen des
   Smart Meter-Businessportals (smartmeter-business.wienernetze.at/einstellungen).

Hinweis: Pruefen, ob das mit dem Privatkunden-Webportal-Account geht oder ob ein
Businessportal-Zugang noetig ist (die client-id/secret liegen im Businessportal).
Falls das fuer Privatkunden nicht verfuegbar ist -> Fallback siehe unten.

## Fallback (nur falls offizielle Credentials nicht beschaffbar)

Web-Login-Wrapper MIT PKCE-Fix: `pip install git+https://github.com/florianL21/vienna-smartmeter.git`
(bzw. eine Version, die PR DarwinsBuddy#309 / PKCE enthaelt). Login via logwien
User/Passwort; bei Bedarf KEYCLOAK_IDENTITY-Cookie. Fragiler, Cookie laeuft ab.
Nur implementieren, wenn die offizielle API ausfaellt.

## Struktur

```
smartmeter-sync/
├── scripts/
│   ├── login_probe.py          # Credential-Test (ZUERST)
│   └── smartmeter_importer.py  # Hauptjob
├── .github/workflows/sync.yml  # Cron 06:15 UTC + manueller Backfill
├── requirements.txt
├── .env.example
├── README.md
└── CLAUDE.md                   # am Ende aktualisieren
```

Die Dateien sind ein lauffaehiger Startpunkt. Review + gegen die echte Lib-API
korrigieren (v0.1.4), nicht raten.

## Lib-API (VERIFIZIERT gegen v0.1.4)

```python
from wiener_netze_smart_meter_api import WNAPIClient
c = WNAPIClient(client_id=..., client_secret=..., api_key=...)   # Token via log.wien client_credentials
c.get_anlagendaten(zaehlpunkt=None, result_type="ALL")
c.get_quarter_hour_values(zp, datum_von, datum_bis, paginate=False, chunk_days=90)  # Datum "%Y-%m-%d"
c.get_daily_values(zp, datum_von, datum_bis, paginate=..., chunk_days=...)
c.get_meter_readings(zp, datum_von, datum_bis, paginate=..., chunk_days=...)
```

Datumsfenster WIRD unterstuetzt (datum_von/datum_bis, "%Y-%m-%d") -> taegl. Lauf zieht
ein enges Fenster, kein 3-Jahres-Dump. Bei beidem None: Lib-Default ~3 Jahre.

### Antwortstruktur (messwerte) - VERIFIZIERT

Liste von Metern; je Meter:
```
{ "zaehlpunkt": "AT...",
  "zaehlwerke": [
    { "obisCode": "1-1:1.9.0", "einheit": "WH",
      "messwerte": [ {"zeitVon": "...", "zeitBis": "...", "messwert": 123, ...}, ... ] }
  ] }
```
- Wert steht in `messwert`, Zeit in `zeitVon`. Einheit auf zaehlwerk-Ebene (`einheit`),
  typischerweise **WH** -> /1000 = kWh (im Code via to_kwh() geloest).
- Mehrere zaehlwerke moeglich (z. B. Bezug + Einspeisung bei PV). Standard: Bezug-Kanal
  via OBIS_FILTER (default Substring "1.9.0"). Matcht keiner -> alle nehmen.
- Einmal echte Antwort loggen und obisCode/einheit gegenchecken (Bezug vs. Einspeisung).

## Importer-Logik

1. WNAPIClient bauen.
2. Zaehlpunkt(e): aus env ZAEHLPUNKT, sonst aus get_anlagendaten().
3. 15-Min-Werte holen, auf {timestamp(aware, Europe/Vienna), kwh} normalisieren.
4. Normaler Lauf: auf LOOKBACK_DAYS (default 3, Ueberlappung gegen Luecken) filtern.
   BACKFILL=1: kompletten Zeitraum schreiben.
5. Idempotent nach Firestore:
   - smartmeter_readings/<zp>_<iso-ts>  (merge=True, keine Duplikate bei Re-Run)
   - smartmeter_daily/<zp>_<YYYY-MM-DD> (kWh-Tagessumme + points)
6. Sauberes Logging, exit != 0 bei Fehler.

Firestore-Zugang: Service-Account-JSON als Secret FIREBASE_SA_JSON, init via
google.cloud.firestore.

## Secrets (GitHub Actions)

WN_CLIENT_ID, WN_CLIENT_SECRET, WN_API_KEY, ZAEHLPUNKT (optional),
FIREBASE_SA_JSON, FIREBASE_PROJECT_ID. Nie ins Repo committen, .env in .gitignore.

## Akzeptanzkriterien

- [ ] login_probe.py laeuft gruen, Zaehlpunkte sichtbar
- [ ] Importer schreibt readings + daily idempotent nach Firestore
- [ ] Re-Run erzeugt keine Duplikate
- [ ] obisCode/einheit gegen reale Antwort gecheckt (Bezug-Kanal, Wh->kWh)
- [ ] Workflow via workflow_dispatch testbar; Backfill-Input funktioniert
- [ ] README + CLAUDE.md aktualisiert (welcher Weg, bekannte Stolpersteine)

## Hinweise

- Tagesversatz: nur Vortageswerte, keine Echtzeit (egal welcher Weg).
- Opt-in muss aktiv sein, sonst nur Jahreswerte / kein Export.
- Zeitzone Europe/Vienna inkl. DST; Timestamps mit Offset speichern.
- Spaeter: smartmeter_daily ins VoltMetric-Dashboard einhaengen (separater Task).
