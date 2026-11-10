#!/usr/bin/env python3
"""Create Snow Village's consumable IAP in App Store Connect (pattern: claires-space tools/store/asc_iaps.py).
Same product id in the app, RevenueCat, Google Play and the server (snowvill_product_credits).
Price: Korea is the base territory with an exact ₩2,900 price point (Apple equalizes other territories).
All territories + new ones. Nothing is submitted for review. Idempotent: skips what already exists.
Run from mobile/:  python3 tools/store/asc_iaps.py"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from asc import call  # noqa: E402

APP = "6832823869"  # Snow Village, com.mkideabox.snowvillage
PRODUCT = "snowvillage_big_village"
KRW = "2900"
LOCALIZATIONS = {
    "ko": ("큰 마을", "무료 6채 마을을 친구 8명이 사는 큰 마을로 키워요."),
    "en-US": ("Big Village", "Grow a free 6-house village into 8 houses."),
}
REVIEW_NOTE = (
    "Consumable 'Big Village' upgrade. Free villages hold 6 houses; buying one lets any village hold 8. "
    "The purchase is verified by RevenueCat and credited to a server wallet, then applied to the village. "
    "No login. How to reach it: create a village (Home > 새 마을 만들기), open it, then the top-right menu (⋮) "
    "> '큰 마을로 키우기' (Grow into a big village). No random items."
)


def ok(s, j, what):
    if s >= 300:
        print("FAIL", what, s, json.dumps(j)[:600])
        sys.exit(1)
    return j


def main():
    existing = {d["attributes"]["productId"]: d["id"]
                for d in ok(*call("GET", f"/v1/apps/{APP}/inAppPurchasesV2?limit=200"), "list")["data"]}
    if PRODUCT in existing:
        iap = existing[PRODUCT]
        print("exists ", PRODUCT, iap)
    else:
        iap = ok(*call("POST", "/v2/inAppPurchases", {"data": {"type": "inAppPurchases", "attributes": {
            "name": "Big Village", "productId": PRODUCT, "inAppPurchaseType": "CONSUMABLE", "reviewNote": REVIEW_NOTE},
            "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}}), "create")["data"]["id"]
        print("created", PRODUCT, iap)

    have = {d["attributes"]["locale"]: d for d in ok(*call("GET", f"/v2/inAppPurchases/{iap}/inAppPurchaseLocalizations"), "locs")["data"]}
    for loc, (name, desc) in LOCALIZATIONS.items():
        if loc not in have:
            ok(*call("POST", "/v1/inAppPurchaseLocalizations", {"data": {"type": "inAppPurchaseLocalizations",
                "attributes": {"locale": loc, "name": name, "description": desc},
                "relationships": {"inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap}}}}}), f"loc {loc}")
            print("localized", loc)

    # Price: KOR base territory, exact ₩2,900 point.
    points = ok(*call("GET", f"/v2/inAppPurchases/{iap}/pricePoints?filter[territory]=KOR&limit=800"), "pricepoints")["data"]
    pp = next((p for p in points if p["attributes"]["customerPrice"] in (KRW, KRW + ".0")), None)
    if not pp:
        print("no KRW point", KRW, sorted({p['attributes']['customerPrice'] for p in points})[:40])
        sys.exit(1)
    s, j = call("GET", f"/v2/inAppPurchases/{iap}/iapPriceSchedule?include=manualPrices")
    has_price = s < 300 and any(i["type"] == "inAppPurchasePrices" for i in j.get("included", []))
    if not has_price:
        ok(*call("POST", "/v1/inAppPurchasePriceSchedules", {"data": {"type": "inAppPurchasePriceSchedules", "relationships": {
            "inAppPurchase": {"data": {"type": "inAppPurchases", "id": iap}},
            "baseTerritory": {"data": {"type": "territories", "id": "KOR"}},
            "manualPrices": {"data": [{"type": "inAppPurchasePrices", "id": "${p0}"}]}}},
            "included": [{"type": "inAppPurchasePrices", "id": "${p0}", "attributes": {"startDate": None},
                          "relationships": {"inAppPurchasePricePoint": {"data": {"type": "inAppPurchasePricePoints", "id": pp["id"]}}}}]}),
           "price")
        print("priced KRW", KRW)
    eq = ok(*call("GET", f"/v1/inAppPurchasePricePoints/{pp['id']}/equalizations?filter[territory]=USA&limit=5"), "eq")["data"]
    usd = eq[0]["attributes"]["customerPrice"] if eq else "?"

    terr = [t["id"] for t in ok(*call("GET", "/v1/territories?limit=200"), "territories")["data"]]
    s, j = call("POST", "/v1/inAppPurchaseAvailabilities", {"data": {"type": "inAppPurchaseAvailabilities",
        "attributes": {"availableInNewTerritories": True}, "relationships": {
            "inAppPurchase": {"data": {"type": "inAppPurchases", "id": iap}},
            "availableTerritories": {"data": [{"type": "territories", "id": t} for t in terr]}}}})
    if s >= 300 and "already" not in json.dumps(j).lower() and s != 409:
        ok(s, j, "availability")
    state = ok(*call("GET", f"/v2/inAppPurchases/{iap}"), "state")["data"]["attributes"]["state"]
    print(f"\nproduct_id | ASC id | KRW | USD (Apple) | state\n{PRODUCT} | {iap} | {KRW} | {usd} | {state}")


if __name__ == "__main__":
    main()
