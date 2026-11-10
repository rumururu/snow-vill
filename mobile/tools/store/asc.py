#!/usr/bin/env python3
"""App Store Connect API helper for Snow Village (same shape as claires-space fastlane/asc.py).
Key: the company team key DGS7ANBS8T; the .p8 sits beside the iOS Fastfile (gitignored).
Usage: python3 tools/store/asc.py GET "/v1/bundleIds?filter[identifier]=com.mkideabox.snowvillage"
       python3 tools/store/asc.py POST /v1/bundleIds '{"data":{...}}'
Prints the JSON response (no secrets)."""
import json
import os
import sys
import time
import urllib.error
import urllib.request

import jwt

KEY_ID = "DGS7ANBS8T"
ISSUER_ID = "02b6b091-bc95-4ca4-ba1b-7ffa4c71680b"
KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ios", "fastlane", f"AuthKey_{KEY_ID}.p8")


def token() -> str:
    now = int(time.time())
    key = open(KEY_PATH).read()
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"}, key,
                      algorithm="ES256", headers={"kid": KEY_ID})


def call(method: str, path: str, body=None):
    req = urllib.request.Request(
        "https://api.appstoreconnect.apple.com" + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read()
            return r.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read()
        return e.code, (json.loads(t) if t else {})


if __name__ == "__main__":
    m, p = sys.argv[1], sys.argv[2]
    b = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    s, j = call(m, p, b)
    print(s)
    print(json.dumps(j, ensure_ascii=False, indent=1)[:6000])
