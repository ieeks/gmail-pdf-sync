# smartmeter-sync

Täglicher Sync der Stromverbrauchsdaten aus dem **Wiener-Netze-Smart-Meter** nach
Firestore. Headless, GitHub-Actions-Cron, kostenfrei.

Nutzt die **offizielle** WSTW Smart Meter API (`wiener-netze-smart-meter-api`) statt
Web-Login-Scraping → kein Keycloak/PKCE-Bruch, kein Cookie-Ablauf.

## Warum offizielle API statt Web-Login

Wiener Netze hat den logwien-Login auf **PKCE** umgestellt. Die web-login-basierten
Wrapper (vienna-smartmeter, DarwinsBuddy HA) brechen dadurch regelmäßig und brauchen
laufend Fixes (z. B. DarwinsBuddy PR #309) oder einen ablaufenden Cookie. Für einen
unbeaufsichtigten Cron ungeeignet. Die offizielle API ist stabil.

Tradeoff: einmalige Registrierung mit **~1–2 Wochen Freischaltzeit**.

## Setup-Voraussetzungen (einmalig)

1. Account am [WSTW Developer-Portal](https://api-portal.wienerstadtwerke.at/).
2. Application für `WN_SMART_METER_API` anlegen → nach Freischaltung **API-key** in den
   Application-Details.
3. E-Mail an `support.sm-portal@wienit.at`: App mit dem Smart-Meter-Portal-User
   verknüpfen (Applikationsname + SM-Portal-E-Mail). Dauer 1–2 Wochen.
4. Danach **client-id** + **client-secret** in den Einstellungen des
   [Smart Meter-Businessportals](https://smartmeter-business.wienernetze.at/einstellungen).

Zusätzlich: **Opt-in** muss aktiv sein (Viertelstundenwerte), sonst nur Jahreswerte.

## Lokal testen

Alle Befehle aus dem Repo-Root, der Code liegt unter `smartmeter/`:

```bash
pip install -r smartmeter/requirements.txt
cp smartmeter/.env.example smartmeter/.env   # WN_CLIENT_ID / _SECRET / _API_KEY ausfüllen
python smartmeter/scripts/login_probe.py        # ZUERST: Credentials testen
python smartmeter/scripts/smartmeter_importer.py
```

Die `.env` wird via `python-dotenv` automatisch geladen. In GitHub Actions
kommen die Werte stattdessen aus Secrets.

## Backfill (einmalig, ~3 Jahre)

```bash
BACKFILL=1 python smartmeter/scripts/smartmeter_importer.py
```
oder GitHub Actions → "Run workflow" → `backfill` = `1`.

> ⚠ **Firestore-Free-Tier beachten:** ~3 Jahre × 15-Min-Werte × 2 Haushalte
> ≈ 200.000 Einzel-Writes. Der Free-Tier erlaubt **20.000 Writes/Tag**. Den
> Backfill daher über mehrere Tage stückeln (engere Datumsfenster) oder für den
> Backfill nur `smartmeter_daily` schreiben. Der **tägliche** Lauf
> (~192 Punkte/Zähler) liegt weit unter dem Limit.

## GitHub-Actions-Secrets

| Secret | Zweck |
|---|---|
| `WN_CLIENT_ID`, `WN_CLIENT_SECRET` | aus Businessportal-Einstellungen |
| `WN_API_KEY` | aus Developer-Portal Application |
| `ZAEHLPUNKT` | optional, sonst alle Zähler |
| `FIREBASE_SA_JSON` | kompletter Service-Account-JSON-Inhalt |
| `FIREBASE_PROJECT_ID` | optional |

## Firestore-Schema

- `smartmeter_readings/<zp>_<iso-ts>` — Einzelwerte (15 min)
- `smartmeter_daily/<zp>_<YYYY-MM-DD>` — Tagessummen (kWh)

Idempotent (`merge=True`), Re-Runs erzeugen keine Duplikate.

## Fallback (falls offizielle Credentials nicht beschaffbar)

Web-Login-Wrapper mit PKCE-Fix (`florianL21/vienna-smartmeter` bzw. Version mit
DarwinsBuddy#309). Login via logwien-User/Passwort, ggf. `KEYCLOAK_IDENTITY`-Cookie.
Fragiler — nur als Notlösung. Auskommentierte Zeile in `requirements.txt`.

## Bekannte Stolpersteine

- **Tagesversatz**: nur Vortageswerte, keine Echtzeit. Für Live → lokale
  IR-Kundenschnittstelle (DLMS/COSEM), nicht Teil dieses Projekts.
- **Einheit**: Die API liefert Werte meist in **Wh** (`einheit: "WH"`) → /1000 = kWh
  (im Code via `to_kwh()`). Bei echter Antwort einmal gegenchecken.
- **OBIS-Kanal**: Bei PV gibt es mehrere `zaehlwerke` (Bezug + Einspeisung). `OBIS_FILTER`
  (default `1.9.0` = Wirkenergie-Bezug 15 min) wählt den Verbrauchskanal.
- **Privatkunde vs. Businessportal**: client-id/secret liegen im Businessportal — prüfen,
  ob dein Privatkunden-Zugang das hergibt.
