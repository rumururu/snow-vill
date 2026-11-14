#!/usr/bin/env python3
"""Copy Snow Village data from the shared game project to the dedicated snow-village project (cutover, docs/12).

Re-runnable: rows are inserted with ON CONFLICT DO NOTHING (existing rows on the target are never changed) and
photos are copied only when missing. Tables go in foreign-key order with the columns both sides have; identity
sequences are moved past the copied ids. Photos are downloaded from the shared bucket and uploaded to the
dedicated bucket, then checked by MD5. Rate-limit rows (snowvill_calls) are not copied.
bytea columns (owner/claim hashes) travel as hex text.

Usage: python3 supabase/migrate_data.py [--dry-run] [--fresh]
  --fresh  first empties the copied tables on the target (refused once any account data exists there), so the
           final cutover copy also carries rows that changed on the shared project after an earlier copy.
Keychain (service supabase): mkideabox-games-mgmt-token, snow-village-mgmt-token. Nothing secret is printed.
"""

import hashlib
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

SRC = {"ref": "qfhbkfzxhldfycmcwntw", "token": "mkideabox-games-mgmt-token"}
DST = {"ref": "hbpazldzkmkcawfppiiq", "token": "snow-village-mgmt-token"}
TABLES = ["snowvill_villages", "snowvill_houses", "snowvill_reports", "snowvill_moderation_log",
          "snowvill_wallets", "snowvill_purchases", "snowvill_tier_credits", "snowvill_upgrades"]
BUCKET = "snowvill-photos"
DRY = "--dry-run" in sys.argv
FRESH = "--fresh" in sys.argv


def keychain(account: str) -> str:
    return subprocess.run(["security", "find-generic-password", "-a", account, "-s", "supabase", "-w"],
                          capture_output=True, text=True, check=True).stdout.strip()


for p in (SRC, DST):
    p["tok"] = keychain(p["token"])
    p["url"] = f"https://{p['ref']}.supabase.co"


def http(method, url, headers, data=None):
    req = urllib.request.Request(url, data=data, method=method, headers={"User-Agent": "snow-village-migrate", **headers})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def sql(p, query):
    s, b = http("POST", f"https://api.supabase.com/v1/projects/{p['ref']}/database/query",
                {"Authorization": "Bearer " + p["tok"], "Content-Type": "application/json"},
                json.dumps({"query": query}).encode())
    if s >= 300:
        raise SystemExit(f"{p['ref']} query failed HTTP{s}: {b.decode()[:300]}")
    return json.loads(b)


def service_key(p):
    s, b = http("GET", f"https://api.supabase.com/v1/projects/{p['ref']}/api-keys?reveal=true", {"Authorization": "Bearer " + p["tok"]})
    return next(k["api_key"] for k in json.loads(b) if k["name"] == "service_role")


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def columns(p, table, kind="identity"):
    rows = sql(p, f"select column_name, is_identity, data_type from information_schema.columns where table_schema='public' and table_name={lit(table)} order by ordinal_position")
    if kind == "bytea":
        return {r["column_name"] for r in rows if r["data_type"] == "bytea"}
    return {r["column_name"]: r["is_identity"] == "YES" for r in rows}


def copy_table(table):
    src_cols, dst_cols = columns(SRC, table), columns(DST, table)
    cols = [c for c in src_cols if c in dst_cols]
    identity = any(dst_cols[c] for c in cols)
    # bytea comes back from the Management API as a Buffer object: export it as '\\x…' text instead.
    binary = columns(SRC, table, "bytea")
    select = ", ".join(f"'\\x' || encode({c}, 'hex') as {c}" if c in binary else c for c in cols)
    rows = sql(SRC, f"select {select} from {table}")
    before = sql(DST, f"select count(*) as n from {table}")[0]["n"]
    if DRY or not rows:
        print(f"  {table}: source {len(rows)}, target {before}{' (dry run)' if DRY else ''}")
        return
    payload = json.dumps(rows, ensure_ascii=False)
    sql(DST, f"insert into {table} ({', '.join(cols)}) {'overriding system value ' if identity else ''}"
             f"select {', '.join(cols)} from json_populate_recordset(null::{table}, {lit(payload)}::json) on conflict do nothing")
    for c, is_id in dst_cols.items():
        if is_id:
            sql(DST, f"select setval(pg_get_serial_sequence('{table}', '{c}'), greatest((select coalesce(max({c}), 0) from {table}), 1))")
    after = sql(DST, f"select count(*) as n from {table}")[0]["n"]
    print(f"  {table}: source {len(rows)}, target {before} → {after}")


def copy_photos():
    names = [r["name"] for r in sql(SRC, f"select name from storage.objects where bucket_id = {lit(BUCKET)} order by name")]
    have = {r["name"] for r in sql(DST, f"select name from storage.objects where bucket_id = {lit(BUCKET)}")}
    todo = [n for n in names if n not in have]
    print(f"  photos: source {len(names)}, already on target {len(names) - len(todo)}, to copy {len(todo)}{' (dry run)' if DRY else ''}")
    if DRY or not todo:
        return
    sk, dk = service_key(SRC), service_key(DST)
    bad = 0
    for n in todo:
        path = urllib.parse.quote(n)
        s, data = http("GET", f"{SRC['url']}/storage/v1/object/{BUCKET}/{path}", {"apikey": sk, "Authorization": "Bearer " + sk})
        if s != 200:
            print("    download failed", s, n); bad += 1; continue
        s, b = http("POST", f"{DST['url']}/storage/v1/object/{BUCKET}/{path}",
                    {"apikey": dk, "Authorization": "Bearer " + dk, "Content-Type": "image/jpeg", "x-upsert": "false", "cache-control": "max-age=3600"}, data)
        if s >= 300:
            print("    upload failed", s, n); bad += 1; continue
        s, back = http("GET", f"{DST['url']}/storage/v1/object/{BUCKET}/{path}", {"apikey": dk, "Authorization": "Bearer " + dk})
        if s != 200 or hashlib.md5(back).hexdigest() != hashlib.md5(data).hexdigest():
            print("    checksum mismatch", n); bad += 1
    print(f"  photos copied: {len(todo) - bad} ok, {bad} failed")
    if bad:
        raise SystemExit(1)


print(f"shared {SRC['ref']} → dedicated {DST['ref']}{' — DRY RUN' if DRY else ''}")
if FRESH and not DRY:
    linked = sql(DST, "select (select count(*) from snowvill_villages where owner_user is not null) + "
                      "(select count(*) from snowvill_houses where user_id is not null) + "
                      "(select count(*) from snowvill_members) as n")[0]["n"]
    if linked:
        raise SystemExit(f"--fresh refused: the target already has {linked} account-linked rows (live after cutover)")
    sql(DST, "; ".join(f"delete from {t}" for t in reversed(TABLES)))
    print("  target emptied")
for t in TABLES:
    copy_table(t)
copy_photos()
missing = sql(DST, "select count(*) as n from snowvill_houses h where h.photo_path is not null and not exists "
                   f"(select 1 from storage.objects o where o.bucket_id = {lit(BUCKET)} and o.name = h.photo_path)")[0]["n"]
print("houses whose photo is missing on the target:", missing)
