#!/usr/bin/env python3
"""Attach the App Store review screenshot (the in-app purchase screen) to every Snow Village IAP.
Replaces an existing one. Run from mobile/:  python3 tools/store/asc_iap_review_shot.py <png>
Key: the ASC API key used by asc.py (never printed)."""
import hashlib
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from asc import call  # noqa: E402

APP = "6832823869"


def upload(iap_id: str, path: str):
    s, cur = call("GET", f"/v2/inAppPurchases/{iap_id}/appStoreReviewScreenshot")
    if s < 300 and cur.get("data"):
        call("DELETE", f"/v1/inAppPurchaseAppStoreReviewScreenshots/{cur['data']['id']}")
    data = open(path, "rb").read()
    s, j = call("POST", "/v1/inAppPurchaseAppStoreReviewScreenshots", {"data": {
        "type": "inAppPurchaseAppStoreReviewScreenshots",
        "attributes": {"fileName": os.path.basename(path), "fileSize": len(data)},
        "relationships": {"inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap_id}}}}})
    if s >= 300:
        sys.exit(f"reserve {iap_id}: {s} {j}")
    shot = j["data"]
    for op in shot["attributes"]["uploadOperations"]:
        chunk = data[op["offset"]:op["offset"] + op["length"]]
        req = urllib.request.Request(op["url"], data=chunk, method=op["method"],
                                     headers={h["name"]: h["value"] for h in op["requestHeaders"]})
        urllib.request.urlopen(req, timeout=120).read()
    s, j = call("PATCH", f"/v1/inAppPurchaseAppStoreReviewScreenshots/{shot['id']}", {"data": {
        "type": "inAppPurchaseAppStoreReviewScreenshots", "id": shot["id"],
        "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    print("review screenshot", iap_id, s, "" if s < 300 else j)


if __name__ == "__main__":
    s, iaps = call("GET", f"/v1/apps/{APP}/inAppPurchasesV2?limit=50")
    for d in iaps["data"]:
        upload(d["id"], sys.argv[1])
