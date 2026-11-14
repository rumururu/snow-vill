#!/usr/bin/env python3
"""Sign-in settings of the dedicated snow-village project (Google + Apple only), re-runnable.

Also renews the Apple client secret: a JWT signed with the Sign in with Apple key, valid at most 6 months
(Apple's limit). Run again before the printed expiry date (docs/12-accounts-and-private-villages.md).

Keychain: snow-village-mgmt-token (supabase), snow-village-google-web-secret (google-oauth),
snow-village-apple-signin-key (apple-signin, base64 of the .p8). Nothing secret is printed.
Usage: python3 supabase/auth_config.py
"""

import base64
import datetime
import json
import subprocess
import time
import urllib.error
import urllib.request

import jwt

REF = "hbpazldzkmkcawfppiiq"
TEAM_ID = "3SAMRT9KZD"
APPLE_KEY_ID = "7W98CY35QQ"
APPLE_SERVICES_ID = "com.mkideabox.snowvillage.web"  # web + Android (OAuth redirect)
APPLE_APP_ID = "com.mkideabox.snowvillage"           # native iOS (id token)
GOOGLE_CLIENTS = [
    "326320694955-6ltlbk16iv6knc29agfmjevp6bopa8oi.apps.googleusercontent.com",  # web (also the Android serverClientId)
    "326320694955-0ovsn0vsf9mqlf65v3nk8ta5ijt7epng.apps.googleusercontent.com",  # iOS
]
REDIRECTS = [
    "https://snow.mkideabox.com/**",
    "https://snow-village.myappmanage.workers.dev/**",
    "http://localhost:3000/**",
    "com.mkideabox.snowvillage://login-callback",
]
SECRET_DAYS = 179


def keychain(account: str, service: str) -> str:
    return subprocess.run(["security", "find-generic-password", "-a", account, "-s", service, "-w"],
                          capture_output=True, text=True, check=True).stdout.strip()


def apple_client_secret() -> tuple[str, int]:
    pem = base64.b64decode(keychain("snow-village-apple-signin-key", "apple-signin"))
    now = int(time.time())
    exp = now + SECRET_DAYS * 86400
    claims = {"iss": TEAM_ID, "iat": now, "exp": exp, "aud": "https://appleid.apple.com", "sub": APPLE_SERVICES_ID}
    return jwt.encode(claims, pem, algorithm="ES256", headers={"kid": APPLE_KEY_ID}), exp


def main() -> None:
    secret, exp = apple_client_secret()
    body = {
        "site_url": "https://snow.mkideabox.com",
        "uri_allow_list": ",".join(REDIRECTS),
        "external_email_enabled": False,
        "external_phone_enabled": False,
        "external_anonymous_users_enabled": False,
        "external_google_enabled": True,
        "external_google_client_id": ",".join(GOOGLE_CLIENTS),
        "external_google_secret": keychain("snow-village-google-web-secret", "google-oauth"),
        # google_sign_in on iOS cannot pass a nonce through; the audience check stays on.
        "external_google_skip_nonce_check": True,
        "external_apple_enabled": True,
        "external_apple_client_id": f"{APPLE_SERVICES_ID},{APPLE_APP_ID}",
        "external_apple_secret": secret,
    }
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/config/auth", data=json.dumps(body).encode(), method="PATCH",
        headers={"Authorization": "Bearer " + keychain("snow-village-mgmt-token", "supabase"),
                 "Content-Type": "application/json", "User-Agent": "snow-village-setup"})
    try:
        with urllib.request.urlopen(req) as r:
            d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"auth config HTTP{e.code}: {e.read().decode()[:300]}")
    print("google:", d["external_google_enabled"], "apple:", d["external_apple_enabled"], "email:", d["external_email_enabled"])
    print("apple client secret valid until", datetime.date.fromtimestamp(exp))


if __name__ == "__main__":
    main()
