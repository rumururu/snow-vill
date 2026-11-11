#!/usr/bin/env python3
"""Create Snow Village's consumable IAPs in App Store Connect (pattern: claires-space tools/store/asc_iaps.py).
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
# Village expansion steps (docs/11-village-expansion-plan.md): each opens 3 more lots in a district.
#   tier 1  6→9   ₩2,900   tier 2  9→12  ₩6,900   tier 3  12→15  ₩12,900   tier 4  every later step ₩25,800
PRODUCTS = [  # product id, KRW, (ko name, ko desc), (en name, en desc)
    ("snowvillage_big_village", "2900", ("마을 넓히기 1단계", "무료 6채 마을에 집터 3곳을 더 열어 9채로 넓혀요."),
     ("Village +3 (step 1)", "Open 3 more lots: a free 6-house village grows to 9.")),
    ("snowvillage_expand_2", "6900", ("마을 넓히기 2단계", "9채 마을에 집터 3곳을 더 열어 12채로 넓혀요."),
     ("Village +3 (step 2)", "Open 3 more lots: a 9-house village grows to 12.")),
    ("snowvillage_expand_3", "12900", ("마을 넓히기 3단계", "12채 마을에 집터 3곳을 더 열어 15채로 넓혀요."),
     ("Village +3 (step 3)", "Open 3 more lots: a 12-house village grows to 15.")),
    # The App Store has no ₩25,800 price point (nearest: 25,500 / 25,900) → ₩25,900 here; Play uses ₩25,800.
    ("snowvillage_expand_4", "25900", ("마을 넓히기 4단계", "15채 이상 마을에 집터 3곳을 더 열어요 (최대 60채)."),
     ("Village +3 (step 4)", "Open 3 more lots in a village of 15+ (up to 60).")),
]
REVIEW_NOTE = (
    "Consumable village expansion. Free villages hold 6 houses; each purchase opens 3 more lots in a district the "
    "buyer picks (price depends on the village size). The purchase is verified by RevenueCat and credited to a server "
    "wallet, then applied to the village. No login. How to reach it: create a village (Home > 새 마을 만들기), open it, "
    "then the top-right menu (⋮) > '마을 넓히기' (Grow the village), pick a district and buy. No random items."
)


def ok(s, j, what):
    if s >= 300:
        print("FAIL", what, s, json.dumps(j)[:600])
        sys.exit(1)
    return j


def main():
    existing = {d["attributes"]["productId"]: d["id"]
                for d in ok(*call("GET", f"/v1/apps/{APP}/inAppPurchasesV2?limit=200"), "list")["data"]}
    terr = [t["id"] for t in ok(*call("GET", "/v1/territories?limit=200"), "territories")["data"]]
    rows = []
    for product, krw, ko, en in PRODUCTS:
        rows.append(one(existing, terr, product, krw, {"ko": ko, "en-US": en}))
    print("\nproduct_id | ASC id | KRW | USD (Apple) | state")
    for r in rows:
        print(" | ".join(map(str, r)))


def one(existing, terr, PRODUCT, KRW, LOCALIZATIONS):
    if PRODUCT in existing:
        iap = existing[PRODUCT]
        print("exists ", PRODUCT, iap)
        # keep the review note and reference name current (the first product predates the expansion model)
        call("PATCH", f"/v2/inAppPurchases/{iap}", {"data": {"type": "inAppPurchases", "id": iap,
             "attributes": {"name": LOCALIZATIONS["en-US"][0], "reviewNote": REVIEW_NOTE}}})
    else:
        iap = ok(*call("POST", "/v2/inAppPurchases", {"data": {"type": "inAppPurchases", "attributes": {
            "name": LOCALIZATIONS["en-US"][0], "productId": PRODUCT, "inAppPurchaseType": "CONSUMABLE", "reviewNote": REVIEW_NOTE},
            "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}}), "create " + PRODUCT)["data"]["id"]
        print("created", PRODUCT, iap)

    have = {d["attributes"]["locale"]: d for d in ok(*call("GET", f"/v2/inAppPurchases/{iap}/inAppPurchaseLocalizations"), "locs")["data"]}
    for loc, (name, desc) in LOCALIZATIONS.items():
        if loc not in have:
            ok(*call("POST", "/v1/inAppPurchaseLocalizations", {"data": {"type": "inAppPurchaseLocalizations",
                "attributes": {"locale": loc, "name": name, "description": desc},
                "relationships": {"inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap}}}}}), f"loc {loc}")
            print("localized", PRODUCT, loc)
        elif (have[loc]["attributes"]["name"], have[loc]["attributes"].get("description")) != (name, desc):
            ok(*call("PATCH", f"/v1/inAppPurchaseLocalizations/{have[loc]['id']}", {"data": {"type": "inAppPurchaseLocalizations",
                "id": have[loc]["id"], "attributes": {"name": name, "description": desc}}}), f"loc update {loc}")
            print("relocalized", PRODUCT, loc)

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

    s, j = (409, {}) if PRODUCT in existing else call("POST", "/v1/inAppPurchaseAvailabilities", {"data": {"type": "inAppPurchaseAvailabilities",
        "attributes": {"availableInNewTerritories": True}, "relationships": {
            "inAppPurchase": {"data": {"type": "inAppPurchases", "id": iap}},
            "availableTerritories": {"data": [{"type": "territories", "id": t} for t in terr]}}}})
    if s >= 300 and "already" not in json.dumps(j).lower() and s != 409:
        ok(s, j, "availability")
    state = ok(*call("GET", f"/v2/inAppPurchases/{iap}"), "state")["data"]["attributes"]["state"]
    return (PRODUCT, iap, KRW, usd, state)


if __name__ == "__main__":
    main()
