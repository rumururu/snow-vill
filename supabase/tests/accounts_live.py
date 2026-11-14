#!/usr/bin/env python3
"""Signed-in flows on the dedicated project through the same paths the apps use (REST + Edge Function).

Sessions come from the admin API (create user → magic link → verify); nothing is mailed. Users and villages
are removed at the end. Usage: python3 supabase/tests/accounts_live.py   (keychain snow-village-mgmt-token)
"""

import io
import json
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

from PIL import Image

REF = "hbpazldzkmkcawfppiiq"
URL = f"https://{REF}.supabase.co"
FN = f"{URL}/functions/v1/snowvill-photo"
TOK = subprocess.run(["security", "find-generic-password", "-a", "snow-village-mgmt-token", "-s", "supabase", "-w"],
                     capture_output=True, text=True, check=True).stdout.strip()
passed = failed = 0


def http(method, url, body=None, headers=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {"User-Agent": "snow-village-tests", **({"Content-Type": ctype} if data is not None else {}), **(headers or {})}
    r = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=60) as x:
            t = x.read().decode()
            return x.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try:
            return e.code, json.loads(t)
        except ValueError:
            return e.code, t[:200]


keys = http("GET", f"https://api.supabase.com/v1/projects/{REF}/api-keys?reveal=true", headers={"Authorization": "Bearer " + TOK})[1]
SVC = next(k["api_key"] for k in keys if k["name"] == "service_role")
ANON = next(k["api_key"] for k in keys if k["name"] == "anon")
ADMIN = {"apikey": SVC, "Authorization": "Bearer " + SVC}


def session():
    email = f"t-{uuid.uuid4().hex[:10]}@snowvill.invalid"
    s, u = http("POST", f"{URL}/auth/v1/admin/users", {"email": email, "email_confirm": True}, ADMIN)
    assert s == 200, (s, u)
    s, link = http("POST", f"{URL}/auth/v1/admin/generate_link", {"type": "magiclink", "email": email}, ADMIN)
    s, sess = http("POST", f"{URL}/auth/v1/verify", {"type": "magiclink", "token_hash": link["hashed_token"]}, {"apikey": ANON})
    assert s == 200 and sess.get("access_token"), (s, sess)
    return u["id"], sess["access_token"]


def as_user(token):
    return {"apikey": ANON, "Authorization": "Bearer " + (token or ANON)}


def rpc(token, fn, args):
    return http("POST", f"{URL}/rest/v1/rpc/{fn}", args, as_user(token))


def fn(token, body):
    return http("POST", FN, body, as_user(token))


def upload(token, install, house, secret=None):
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 30, 30)).save(buf, "JPEG", quality=80)
    b = "----sv" + uuid.uuid4().hex
    parts = [("install_id", install), ("house_id", house)] + ([("secret", secret)] if secret else [])
    body = b"".join(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in parts)
    body += f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"p.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode()
    body += buf.getvalue() + f"\r\n--{b}--\r\n".encode()
    return http("POST", FN, raw=body, headers=as_user(token), ctype=f"multipart/form-data; boundary={b}")


def check(name, ok, detail=""):
    global passed, failed
    passed, failed = (passed + 1, failed) if ok else (passed, failed + 1)
    print("  ✅" if ok else "  ❌", name, "" if ok else detail)


users, villages = [], []
I = str(uuid.uuid4())
try:
    A_id, A = session(); C_id, C = session(); users += [A_id, C_id]

    print("1. signed-in create, claim, photo without secrets")
    s, v = rpc(A, "snowvill_create_village", {"p_install_id": I, "p_name": "로그인 마을"})
    vid = v["id"]; villages.append(vid)
    s, g = rpc(A, "snowvill_get_village", {"p_village_id": vid})
    check("creator is owner", g["me"]["role"] == "owner", g.get("me"))
    s, h = rpc(A, "snowvill_claim_house", {"p_install_id": I, "p_village_id": vid, "p_slot": 0, "p_nickname": "주인", "p_style": "brick", "p_message": "", "p_direction": 0})
    hid = h["house"]["id"]
    s, r = upload(A, I, hid)
    check("upload with the account, no secret", s == 200 and r.get("ok"), (s, r))
    s, r = upload(None, I, hid)
    check("guest without a secret cannot upload", s in (400, 403) and r.get("error") == "FORBIDDEN", (s, r))

    print("2. private village photos and membership")
    s, r = rpc(A, "snowvill_set_visibility", {"p_village_id": vid, "p_visibility": "private"})
    check("owner makes it private", r.get("ok") is True, r)
    s, r = fn(None, {"action": "view", "install_id": I, "village_id": vid, "house_id": hid})
    check("guest cannot view the photo", s == 404, (s, r))
    s, r = fn(A, {"action": "view", "install_id": I, "village_id": vid, "house_id": hid})
    check("owner views the photo", s == 200 and r.get("url"), (s, r))
    s, r = fn(C, {"action": "view", "install_id": I, "village_id": vid, "house_id": hid})
    check("non-member cannot view", s == 404, (s, r))
    s, r = rpc(C, "snowvill_request_join", {"p_village_id": vid, "p_nickname": "씨"})
    check("join request", r.get("role") == "pending", r)
    s, r = rpc(A, "snowvill_decide_member", {"p_village_id": vid, "p_user_id": C_id, "p_approve": True})
    check("owner approves", r.get("ok") is True, r)
    s, r = fn(C, {"action": "view", "install_id": I, "village_id": vid, "house_id": hid})
    check("approved member views", s == 200 and r.get("url"), (s, r))
    s, r = rpc(None, "snowvill_my_villages", {})
    check("guest cannot call my_villages", s in (401, 403, 404), (s, r))
    s, r = rpc(C, "snowvill_my_villages", {})
    check("member's list", s == 200 and any(x["id"] == vid for x in r), (s, r))

    print("3. account-owned deletion")
    s, r = fn(C, {"action": "delete_village", "install_id": I, "village_id": vid})
    check("member cannot delete the village", s == 403, (s, r))
    s, r = fn(A, {"action": "delete_village", "install_id": I, "village_id": vid})
    check("owner deletes without a secret", s == 200 and r.get("ok"), (s, r))
    s, r = fn("not-a-token", {"action": "delete_account", "install_id": I})
    check("delete_account needs a session", s in (400, 401), (s, r))
    s, v2 = rpc(C, "snowvill_create_village", {"p_install_id": I, "p_name": "지울 마을"}); villages.append(v2["id"])
    s, r = fn(C, {"action": "delete_account", "install_id": I})
    check("delete_account", s == 200 and r.get("ok"), (s, r))
    s, u = http("GET", f"{URL}/auth/v1/admin/users/{C_id}", headers=ADMIN)
    check("auth user removed", s == 404, s)
    s, g = rpc(None, "snowvill_get_village", {"p_village_id": v2["id"]})
    check("their village removed", g is None, g)
finally:
    for v in villages:
        http("POST", f"https://api.supabase.com/v1/projects/{REF}/database/query",
             {"query": f"delete from snowvill_villages where id = '{v}'"}, {"Authorization": "Bearer " + TOK})
    http("POST", f"https://api.supabase.com/v1/projects/{REF}/database/query",
         {"query": f"delete from snowvill_calls where install_id = '{I}'"}, {"Authorization": "Bearer " + TOK})
    for u in users:
        http("DELETE", f"{URL}/auth/v1/admin/users/{u}", headers=ADMIN)
    s, left = http("POST", f"https://api.supabase.com/v1/projects/{REF}/database/query",
                   {"query": "select (select count(*) from auth.users where email like '%@snowvill.invalid') as users, "
                             "(select count(*) from storage.objects where bucket_id = 'snowvill-photos') as photos"},
                   {"Authorization": "Bearer " + TOK})
    print("cleanup", left)
print(f"result: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
