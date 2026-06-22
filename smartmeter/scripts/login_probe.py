#!/usr/bin/env python3
"""Credential-Test fuer die offizielle Wiener Netze Smart Meter API.

Zuerst ausfuehren. Prueft, ob client-id/secret/api-key funktionieren und welche
Zaehlpunkte sichtbar sind.

    WN_CLIENT_ID=... WN_CLIENT_SECRET=... WN_API_KEY=... python scripts/login_probe.py
"""
import os
import sys

from wiener_netze_smart_meter_api import WNAPIClient

try:
    from dotenv import load_dotenv

    load_dotenv()  # liest lokale .env (in GitHub Actions kein Effekt)
except ModuleNotFoundError:
    pass


def main() -> int:
    try:
        client = WNAPIClient(
            client_id=os.environ["WN_CLIENT_ID"],
            client_secret=os.environ["WN_CLIENT_SECRET"],
            api_key=os.environ["WN_API_KEY"],
        )
        anlagen = client.get_anlagendaten()
        print("AUTH OK")
        print("Anlagendaten:", anlagen)
        return 0
    except Exception as exc:  # noqa: BLE001
        print("AUTH FAILED:", repr(exc), file=sys.stderr)
        print(
            "-> client-id/secret aus smartmeter-business.wienernetze.at/einstellungen, "
            "API-key aus api-portal.wienerstadtwerke.at (Application-Details). "
            "App muss vom SM-Portal-Support freigeschaltet sein (Bearbeitung 1-2 Wochen).",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
