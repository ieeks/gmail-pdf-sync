#!/usr/bin/env python3
"""Wiener Netze Smart Meter -> Firestore Importer (offizielle WSTW-API).

Nutzt `wiener-netze-smart-meter-api` (WNAPIClient) gegen den offiziellen Endpunkt
api.wstw.at. Token via log.wien client_credentials (kein PKCE/Cookie). Stabil,
fuer unbeaufsichtigten GitHub-Actions-Cron geeignet.

Signaturen/Strukturen gegen v0.1.4 verifiziert:
  get_anlagendaten(zaehlpunkt=None, result_type="ALL")
  get_quarter_hour_values(zaehlpunkt=None, datum_von=None, datum_bis=None,
                          *, paginate=False, chunk_days=90)   # Datum: "%Y-%m-%d"
Antwort (messwerte): Liste von Metern -> meter["zaehlwerke"][] (je obisCode)
  -> zaehlwerk["messwerte"][] mit {"zeitVon","zeitBis","messwert", ...},
     Einheit in zaehlwerk["einheit"] (typ. "WH" -> /1000 = kWh).

ENV:
  WN_CLIENT_ID, WN_CLIENT_SECRET, WN_API_KEY
  ZAEHLPUNKT          optional; sonst alle aus get_anlagendaten()
  LOOKBACK_DAYS       default 3 (Ueberlappung gegen Luecken)
  BACKFILL            "1" -> ganzer verfuegbarer Zeitraum (~3 J., paginiert)
  OBIS_FILTER         optional Substring (default "1.9.0" = Wirkenergie-Bezug 15min)
  FIREBASE_SA_JSON, FIREBASE_PROJECT_ID
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from wiener_netze_smart_meter_api import WNAPIClient

import google.auth
from google.cloud import firestore
from google.oauth2 import service_account

try:
    from dotenv import load_dotenv

    load_dotenv()  # liest lokale .env (in GitHub Actions kein Effekt)
except ModuleNotFoundError:
    pass

TZ = ZoneInfo("Europe/Vienna")
DATE_FMT = "%Y-%m-%d"


# ---------- Clients -------------------------------------------------------

def build_client() -> WNAPIClient:
    return WNAPIClient(
        client_id=os.environ["WN_CLIENT_ID"],
        client_secret=os.environ["WN_CLIENT_SECRET"],
        api_key=os.environ["WN_API_KEY"],
        max_retries=3,
        retry_delay=5,
        timeout=15,
    )


def firestore_client() -> firestore.Client:
    sa_raw = os.environ.get("FIREBASE_SA_JSON")
    project = os.environ.get("FIREBASE_PROJECT_ID")
    if sa_raw:
        info = json.loads(sa_raw)
        creds = service_account.Credentials.from_service_account_info(info)
        return firestore.Client(project=project or info.get("project_id"),
                                credentials=creds)
    creds, default_project = google.auth.default()
    return firestore.Client(project=project or default_project, credentials=creds)


# ---------- Helpers -------------------------------------------------------

def as_list(resp) -> list[dict]:
    if resp is None:
        return []
    return resp if isinstance(resp, list) else [resp]


def to_kwh(value: float, einheit: str | None) -> float:
    if einheit and einheit.upper() in {"WH", "WATTHOURS"}:
        return value / 1000.0
    return value  # KWH oder unbekannt -> unveraendert


def resolve_zaehlpunkte(client: WNAPIClient) -> list[str]:
    env_zp = os.environ.get("ZAEHLPUNKT")
    if env_zp:
        return [env_zp]
    zps: list[str] = []
    for meter in as_list(client.get_anlagendaten()):
        zp = meter.get("zaehlpunkt") or meter.get("zaehlpunktnummer")
        if zp:
            zps.append(zp)
    print(f"[info] {len(zps)} Zaehlpunkt(e): {zps}")
    return zps


def normalize(resp, zp_filter: str, obis_filter: str) -> list[dict]:
    """meter -> zaehlwerke -> messwerte  auf flaches {timestamp, kwh, obis}."""
    points: list[dict] = []
    for meter in as_list(resp):
        zp = meter.get("zaehlpunkt") or meter.get("zaehlpunktnummer") or zp_filter
        zwerke = meter.get("zaehlwerke", [])
        # bevorzugt Bezug-Kanal; wenn keiner matcht, alle nehmen
        matching = [zw for zw in zwerke
                    if obis_filter in (zw.get("obisCode") or "")]
        for zw in (matching or zwerke):
            obis = zw.get("obisCode")
            einheit = zw.get("einheit")
            for mw in zw.get("messwerte", []):
                ts_raw = mw.get("zeitVon") or mw.get("zeitpunktVon")
                val = mw.get("messwert")
                if ts_raw is None or val is None:
                    continue
                ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=TZ)
                points.append({
                    "zaehlpunkt": zp,
                    "timestamp": ts.astimezone(TZ),
                    "kwh": round(to_kwh(float(val), einheit), 4),
                    "obis": obis,
                })
    return points


# ---------- Firestore-Write (idempotent) ----------------------------------

def write_points(db: firestore.Client, points: list[dict]) -> None:
    batch = db.batch()
    n = 0
    daily: dict[tuple[str, str], dict] = {}
    for p in points:
        zp, ts = p["zaehlpunkt"], p["timestamp"]
        ref = db.collection("smartmeter_readings").document(f"{zp}_{ts.isoformat()}")
        batch.set(ref, {
            "zaehlpunkt": zp,
            "timestamp": ts.isoformat(),
            "kwh": p["kwh"],
            "obis": p["obis"],
            "source": "wiener-netze-official",
            "granularity": "15min",
            "imported_at": firestore.SERVER_TIMESTAMP,
        }, merge=True)
        key = (zp, ts.date().isoformat())
        agg = daily.setdefault(key, {"kwh_total": 0.0, "points": 0})
        agg["kwh_total"] += p["kwh"]
        agg["points"] += 1
        n += 1
        if n % 400 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()

    for (zp, day), agg in daily.items():
        db.collection("smartmeter_daily").document(f"{zp}_{day}").set({
            "zaehlpunkt": zp,
            "date": day,
            "kwh_total": round(agg["kwh_total"], 3),
            "points": agg["points"],
        }, merge=True)
    print(f"[ok] {n} readings, {len(daily)} Tagesaggregate geschrieben")


def main() -> int:
    try:
        client = build_client()
        zps = resolve_zaehlpunkte(client)
        if not zps:
            print("[warn] keine Zaehlpunkte gefunden.", file=sys.stderr)
            return 0

        # `or`-Default statt get(...,default): in GitHub Actions sind nicht
        # gesetzte Secrets ein LEERER String, kein None -> get() greift sonst nicht.
        obis_filter = os.environ.get("OBIS_FILTER") or "1.9.0"
        backfill = os.environ.get("BACKFILL") == "1"
        if backfill:
            datum_von = datum_bis = None  # Lib-Default ~3 Jahre
            paginate = True
        else:
            days = int(os.environ.get("LOOKBACK_DAYS") or "3")
            today = date.today()
            datum_von = (today - timedelta(days=days)).strftime(DATE_FMT)
            datum_bis = today.strftime(DATE_FMT)
            paginate = False
        print(f"[info] Fenster {datum_von or '~3J'} .. {datum_bis or 'heute'} "
              f"(backfill={backfill}, obis~{obis_filter})")

        db = firestore_client()
        for zp in zps:
            resp = client.get_quarter_hour_values(zp, datum_von, datum_bis,
                                                  paginate=paginate)
            points = normalize(resp, zp, obis_filter)
            if not points:
                print(f"[warn] {zp}: keine Datenpunkte (Opt-in aktiv?).",
                      file=sys.stderr)
                continue
            write_points(db, points)
        return 0
    except Exception as exc:  # noqa: BLE001
        print("[fail]", repr(exc), file=sys.stderr)
        print("Hinweis: Credentials/Freischaltung pruefen (client-id/secret aus "
              "Businessportal, API-key aus Developer-Portal), Opt-in pruefen.",
              file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
