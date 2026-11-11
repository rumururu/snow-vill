#!/usr/bin/env python3
"""Create Snow Village's one-time products (village expansion steps) on Google Play (monetization.onetimeproducts API; pattern from
claires-space tools/store/play_iaps.py — the legacy inappproducts API is refused for new apps).
Price: USD 1.99 converted to every region by pricing:convertRegionPrices, Korea set to exactly ₩2,900,
USA to exactly $1.99 (same as App Store). Purchase option is activated with --activate.
Idempotent: PATCH with allowMissing. Needs a BILLING build uploaded first (Play refuses otherwise).
Run from mobile/:  python3 tools/store/play_iaps.py [--activate]
Service account: android/fastlane/play-store-key.json (gitignored, never printed)."""
import json
import os
import sys
import time
import urllib.error
import urllib.request

import jwt

PKG = "com.mkideabox.snowvillage"
# Expansion steps (docs/11-village-expansion-plan.md): (product id, USD = App Store's US price, KRW, ko, en)
PRODUCTS = [
    ("snowvillage_big_village", "1.99", 2900, ("마을 넓히기 1단계", "무료 6채 마을에 집터 3곳을 더 열어 9채로 넓혀요. 넓힐 동네는 직접 골라요."),
     ("Village +3 (step 1)", "Open 3 more lots: a free 6-house village grows to 9. You pick the district.")),
    ("snowvillage_expand_2", "3.99", 6900, ("마을 넓히기 2단계", "9채 마을에 집터 3곳을 더 열어 12채로 넓혀요. 넓힐 동네는 직접 골라요."),
     ("Village +3 (step 2)", "Open 3 more lots: a 9-house village grows to 12. You pick the district.")),
    ("snowvillage_expand_3", "7.99", 12900, ("마을 넓히기 3단계", "12채 마을에 집터 3곳을 더 열어 15채로 넓혀요. 넓힐 동네는 직접 골라요."),
     ("Village +3 (step 3)", "Open 3 more lots: a 12-house village grows to 15. You pick the district.")),
    ("snowvillage_expand_4", "14.99", 25900, ("마을 넓히기 4단계", "15채 이상 마을에 집터 3곳을 더 열어요. 최대 60채까지 넓힐 수 있어요."),
     ("Village +3 (step 4)", "Open 3 more lots in a village of 15 or more, up to 60 houses.")),
]
REGIONS_VERSION = "2026/01"
KEY = os.path.join(os.path.dirname(__file__), "..", "..", "android", "fastlane", "play-store-key.json")
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"


def token():
    sa = json.load(open(KEY))
    now = int(time.time())
    a = jwt.encode({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher",
                    "aud": sa["token_uri"], "iat": now, "exp": now + 3000}, sa["private_key"], algorithm="RS256")
    body = f"grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion={a}".encode()
    with urllib.request.urlopen(urllib.request.Request(sa["token_uri"], data=body)) as r:
        return json.load(r)["access_token"]


TOK = None


def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read()
            return r.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read()
        try:
            return e.code, (json.loads(t) if t else {})
        except ValueError:
            return e.code, {"raw": t[:300].decode(errors="replace")}


def money(code, amount):
    units, _, frac = str(amount).partition(".")
    return {"currencyCode": code, "units": units, "nanos": int((frac + "000000000")[:9]) if frac else 0}


def main():
    global TOK
    TOK = token()
    for product, usd, krw, ko, en in PRODUCTS:
        one(product, usd, krw, [("ko-KR", *ko), ("en-US", *en)])


def one(PRODUCT, USD, KRW, LISTINGS):
    s, conv = call("POST", f"{API}/pricing:convertRegionPrices", {"price": money("USD", USD)})
    if s >= 300:
        print("FAIL convert", s, json.dumps(conv)[:400])
        sys.exit(1)
    configs = []
    for region, v in sorted(conv["convertedRegionPrices"].items()):
        price = v["price"]
        if region == "KR":
            price = money("KRW", KRW)
        if region == "US":
            price = money("USD", USD)
        configs.append({"regionCode": region, "price": price, "availability": "AVAILABLE"})
    option = {"purchaseOptionId": "default", "buyOption": {"legacyCompatible": True, "multiQuantityEnabled": False},
              "regionalPricingAndAvailabilityConfigs": configs}
    other = conv.get("convertedOtherRegionsPrice", {})
    if other:
        option["newRegionsConfig"] = {"usdPrice": other["usdPrice"], "eurPrice": other["eurPrice"], "availability": "AVAILABLE"}
    body = {"packageName": PKG, "productId": PRODUCT,
            "listings": [{"languageCode": lc, "title": t, "description": d} for lc, t, d in LISTINGS],
            "purchaseOptions": [option], "taxAndComplianceSettings": {"isTokenizedDigitalAsset": False}}
    s, j = call("PATCH", f"{API}/onetimeproducts/{PRODUCT}?allowMissing=true&updateMask=listings,purchaseOptions"
                         f"&regionsVersion.version={REGIONS_VERSION}", body)
    if s >= 300:
        print("FAIL", PRODUCT, s, json.dumps(j)[:600])
        sys.exit(1)
    states = [o.get("state") for o in j.get("purchaseOptions", [])]
    if "--activate" in sys.argv and states != ["ACTIVE"]:
        s2, j2 = call("POST", f"{API}/oneTimeProducts/{PRODUCT}/purchaseOptions:batchUpdateStates",
                      {"requests": [{"activatePurchaseOptionRequest": {"packageName": PKG, "productId": PRODUCT,
                                                                       "purchaseOptionId": "default"}}]})
        if s2 >= 300:
            print("FAIL activate", PRODUCT, s2, json.dumps(j2)[:400])
            sys.exit(1)
        states = ["ACTIVE"]
    print(f"{PRODUCT} | USD {USD} | KRW {KRW} | regions {len(configs)} | state {states}")


if __name__ == "__main__":
    main()
