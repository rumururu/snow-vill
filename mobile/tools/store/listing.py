#!/usr/bin/env python3
"""Push the store listing text in docs/release_info/snowvillage.yaml to Google Play and App Store Connect.

Idempotent; saves drafts only (no review submission, no release). Images are separate: fastlane lanes `screenshots` (iOS) and `images` (Play), staged by docs/release_assets/tools/build_marketing.py --to-fastlane.
Run from mobile/:  python3 tools/store/listing.py [--play] [--asc]   (both when no flag)
Keys: android/fastlane/play-store-key.json and the ASC API key used by asc.py (never printed)."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.join(HERE, "..", "..", "..", "docs", "release_info", "snowvillage.yaml")

LIMITS = {"title": 30, "name": 30, "subtitle": 30, "short_description": 80, "full_description": 4000,
          "keywords": 100, "promotional_text": 170}


def load():
    # YAML via Ruby's stdlib (no PyYAML in the system Python)
    cfg = json.loads(subprocess.check_output(["ruby", "-ryaml", "-rjson", "-e", "puts JSON.dump(YAML.load_file(ARGV[0]))", SRC]))
    bad = []
    for loc, l10n in cfg["localizations"].items():
        for k, n in LIMITS.items():
            v = (l10n.get(k) or "").strip()
            if len(v) > n:
                bad.append(f"{loc}.{k}: {len(v)} > {n}")
    if bad:
        sys.exit("too long: " + "; ".join(bad))
    return cfg


def play(cfg):
    import play_iaps as P
    P.TOK = P.token()
    s, e = P.call("POST", f"{P.API}/edits", {})
    if s >= 300:
        sys.exit(f"play edit {s} {e}")
    eid = e["id"]
    for l10n in cfg["localizations"].values():
        lang = l10n["google_play_locale"]
        s, j = P.call("PUT", f"{P.API}/edits/{eid}/listings/{lang}", {
            "language": lang, "title": l10n["title"].strip(), "shortDescription": l10n["short_description"].strip(),
            "fullDescription": l10n["full_description"].strip()})
        print("play listing", lang, s, "" if s < 300 else j)
    u = cfg["urls"]
    s, j = P.call("PATCH", f"{P.API}/edits/{eid}/details", {
        "defaultLanguage": "ko-KR", "contactEmail": u["contact_email"], "contactWebsite": u["marketing"]})
    print("play details", s, "" if s < 300 else j)
    s, j = P.call("POST", f"{P.API}/edits/{eid}:commit?changesNotSentForReview=false", {})
    if s >= 300 and "changesNotSentForReview" in str(j):
        s, j = P.call("POST", f"{P.API}/edits/{eid}:commit?changesNotSentForReview=true", {})
    print("play commit", s, "" if s < 300 else str(j)[:400])


def asc(cfg):
    from asc import call
    app = cfg["app"]["asc_app_id"]
    u = cfg["urls"]
    vers = call("GET", f"/v1/apps/{app}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&limit=1")[1]["data"]
    if not vers:
        sys.exit("no editable App Store version")
    ver = vers[0]["id"]
    s, j = call("PATCH", f"/v1/appStoreVersions/{ver}", {"data": {"type": "appStoreVersions", "id": ver,
                                                                 "attributes": {"copyright": cfg["copyright"]}}})
    print("asc copyright", s, "" if s < 300 else j)
    have = {d["attributes"]["locale"]: d["id"] for d in call("GET", f"/v1/appStoreVersions/{ver}/appStoreVersionLocalizations")[1]["data"]}
    info = [i for i in call("GET", f"/v1/apps/{app}/appInfos")[1]["data"]
            if i["attributes"].get("appStoreState") in (None, "PREPARE_FOR_SUBMISSION")
            or i["attributes"].get("state") in (None, "PREPARE_FOR_SUBMISSION")][0]["id"]
    ihave = {d["attributes"]["locale"]: d["id"] for d in call("GET", f"/v1/appInfos/{info}/appInfoLocalizations")[1]["data"]}
    for l10n in cfg["localizations"].values():
        loc = l10n["app_store_locale"]
        attrs = {"description": l10n["full_description"].strip(), "keywords": l10n["keywords"].strip(),
                 "promotionalText": l10n["promotional_text"].strip(), "supportUrl": u["support"], "marketingUrl": u["marketing"]}
        if loc in have:
            s, j = call("PATCH", f"/v1/appStoreVersionLocalizations/{have[loc]}", {"data": {
                "type": "appStoreVersionLocalizations", "id": have[loc], "attributes": attrs}})
        else:
            s, j = call("POST", "/v1/appStoreVersionLocalizations", {"data": {
                "type": "appStoreVersionLocalizations", "attributes": {"locale": loc, **attrs},
                "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": ver}}}}})
        print("asc version loc", loc, s, "" if s < 300 else j)
        iattrs = {"name": l10n["name"], "subtitle": l10n["subtitle"], "privacyPolicyUrl": u["privacy"]}
        if loc not in ihave:  # adding a version localization makes Apple create the app info one: reload
            ihave = {d["attributes"]["locale"]: d["id"] for d in call("GET", f"/v1/appInfos/{info}/appInfoLocalizations")[1]["data"]}
        if loc in ihave:
            s, j = call("PATCH", f"/v1/appInfoLocalizations/{ihave[loc]}", {"data": {
                "type": "appInfoLocalizations", "id": ihave[loc], "attributes": iattrs}})
        else:
            s, j = call("POST", "/v1/appInfoLocalizations", {"data": {
                "type": "appInfoLocalizations", "attributes": {"locale": loc, **iattrs},
                "relationships": {"appInfo": {"data": {"type": "appInfos", "id": info}}}}})
        print("asc info loc", loc, s, "" if s < 300 else j)
    cat = cfg["category"]
    s, j = call("PATCH", f"/v1/appInfos/{info}", {"data": {"type": "appInfos", "id": info, "relationships": {
        "primaryCategory": {"data": {"type": "appCategories", "id": cat["app_store"]}},
        "secondaryCategory": {"data": {"type": "appCategories", "id": cat["app_store_secondary"]}}}}})
    print("asc categories", s, "" if s < 300 else j)
    notes = cfg["localizations"]["ko"]["review_notes"].strip()
    s, rd = call("GET", f"/v1/appStoreVersions/{ver}/appStoreReviewDetail")
    if s < 300 and rd.get("data"):
        rid = rd["data"]["id"]
        s, j = call("PATCH", f"/v1/appStoreReviewDetails/{rid}", {"data": {"type": "appStoreReviewDetails", "id": rid,
                                                                          "attributes": {"notes": notes, "demoAccountRequired": False}}})
    else:
        s, j = call("POST", "/v1/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails",
                     "attributes": {"notes": notes, "demoAccountRequired": False},
                     "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": ver}}}}})
    print("asc review notes", s, "" if s < 300 else str(j)[:300])


if __name__ == "__main__":
    c = load()
    flags = set(sys.argv[1:])
    if not flags or "--play" in flags:
        play(c)
    if not flags or "--asc" in flags:
        asc(c)
