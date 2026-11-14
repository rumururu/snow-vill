#!/usr/bin/env python3
"""Account + private-village rules on the dedicated project (SQL level, Management API).

Each call runs in one transaction with request.jwt.claims set, so auth.uid() is the simulated user — the same
value PostgREST sets for a signed-in request. Test users are inserted into auth.users and removed at the end.
Usage: python3 supabase/tests/accounts.py   (keychain snow-village-mgmt-token)
"""

import json
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

REF = "hbpazldzkmkcawfppiiq"
TOK = subprocess.run(["security", "find-generic-password", "-a", "snow-village-mgmt-token", "-s", "supabase", "-w"],
                     capture_output=True, text=True, check=True).stdout.strip()
passed = failed = 0


def sql(query: str):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query",
                                 data=json.dumps({"query": query}).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json",
                                          "User-Agent": "snow-village-tests"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:300]}


def lit(v) -> str:
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def call(user, fn_sql: str):
    """Run `select <fn_sql> as r` as `user` (None = anon guest). Returns the value or {'error': ...}."""
    claims = json.dumps({"sub": str(user), "role": "authenticated"}) if user else json.dumps({"role": "anon"})
    out = sql(f"begin; select set_config('request.jwt.claims', {lit(claims)}, true); "
              f"select ({fn_sql}) as r; commit;")
    if isinstance(out, dict):
        return out
    return out[0]["r"] if out else None


def check(name: str, ok: bool, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print("  ✅", name)
    else:
        failed += 1
        print("  ❌", name, detail)


def err(v) -> bool:
    return isinstance(v, dict) and "error" in v


A, B, C, E = (uuid.uuid4() for _ in range(4))
INSTALL = uuid.uuid4()
users = [A, B, C, E]
villages: list[str] = []
try:
    sql("insert into auth.users (id, aud, role, email, instance_id) values " + ",".join(
        f"({lit(u)}, 'authenticated', 'authenticated', {lit(f'test-{u}@snowvill.invalid')}, '00000000-0000-0000-0000-000000000000')"
        for u in users))

    print("1. signed-in owner and residents")
    r = call(A, f"snowvill_create_village({lit(uuid.uuid4())}::uuid, '계정 테스트')")
    vid = r["id"]; villages.append(vid)
    owner = sql(f"select owner_user from snowvill_villages where id = {lit(vid)}")[0]["owner_user"]
    check("village owner_user = creator", owner == str(A), owner)
    g = call(A, f"snowvill_get_village({lit(vid)})")
    check("owner sees me.role owner", g["me"]["role"] == "owner", g.get("me"))
    r = call(B, f"snowvill_claim_house({lit(uuid.uuid4())}::uuid, {lit(vid)}, 0, '비', 'brick', '', 0)")
    check("signed-in claim ok", not err(r) and r.get("ok"), r)
    g = call(B, f"snowvill_get_village({lit(vid)})")
    check("resident sees me.role resident + house id", g["me"]["role"] == "resident" and g["me"]["house_id"], g.get("me"))
    r = call(B, f"snowvill_claim_house({lit(uuid.uuid4())}::uuid, {lit(vid)}, 1, '비2', 'brick', '', 0)")
    check("second house for the same account refused", err(r) or not r.get("ok"), r)

    print("2. private village")
    r = call(B, f"snowvill_set_visibility({lit(vid)}, 'private')")
    check("non-owner cannot make it private", r.get("ok") is False, r)
    r = call(A, f"snowvill_set_visibility({lit(vid)}, 'private')")
    check("owner makes it private", r.get("ok") is True, r)
    g = call(None, f"snowvill_get_village({lit(vid)})")
    check("guest sees only a locked stub", g["locked"] is True and "houses" not in g, g)
    g = call(B, f"snowvill_get_village({lit(vid)})")
    check("resident still sees the village", g["locked"] is False and len(g["houses"]) == 1, g.get("locked"))
    r = call(C, f"snowvill_claim_house({lit(uuid.uuid4())}::uuid, {lit(vid)}, 2, '씨', 'brick', '', 0)")
    check("non-member cannot claim in a private village", err(r) or not r.get("ok"), r)
    r = call(C, f"snowvill_request_join({lit(vid)}, '씨')")
    check("join request → pending", r.get("role") == "pending", r)
    g = call(C, f"snowvill_get_village({lit(vid)})")
    check("pending visitor still locked, role pending", g["locked"] and g["me"]["role"] == "pending", g)
    m = call(A, f"snowvill_members_of({lit(vid)})")
    check("owner sees the request", isinstance(m, list) and m and m[0]["status"] == "pending", m)
    m = call(B, f"snowvill_members_of({lit(vid)})")
    check("non-owner gets nothing", m is None, m)
    r = call(B, f"snowvill_decide_member({lit(vid)}, {lit(C)}::uuid, true)")
    check("non-owner cannot approve", r.get("ok") is False, r)
    r = call(A, f"snowvill_decide_member({lit(vid)}, {lit(C)}::uuid, true)")
    check("owner approves", r.get("ok") is True, r)
    g = call(C, f"snowvill_get_village({lit(vid)})")
    check("approved member sees the village", g["locked"] is False and g["me"]["role"] == "member", g.get("me"))
    r = call(C, f"snowvill_claim_house({lit(uuid.uuid4())}::uuid, {lit(vid)}, 2, '씨', 'brick', '', 0)")
    check("approved member claims a house", not err(r) and r.get("ok"), r)
    path = sql(f"select snowvill_photo_path({lit(vid)}, (select id from snowvill_houses where village_id = {lit(vid)} limit 1), null, null) as p")[0]["p"]
    check("photo path hidden from guests of a private village", path is None, path)

    print("3. owner look by account, my villages")
    r = call(A, f"snowvill_set_village_look({lit(INSTALL)}::uuid, {lit(vid)}, null, 'brick', '{{}}'::jsonb)")
    check("signed-in owner changes the look without a secret", r.get("ok") is True, r)
    r = call(C, f"snowvill_set_village_look({lit(INSTALL)}::uuid, {lit(vid)}, null, 'snow', '{{}}'::jsonb)")
    check("member cannot change the look", r.get("ok") is False, r)
    mv = call(A, "snowvill_my_villages()")
    check("owner's list has the village", any(x["id"] == vid and x["role"] == "owner" for x in mv), mv)
    mv = call(C, "snowvill_my_villages()")
    check("member's list has the village", any(x["id"] == vid and x["role"] == "resident" for x in mv), mv)
    r = call(None, "snowvill_my_villages()")
    check("guest gets an empty list", r == [] or err(r), r)
    r = sql("select bool_or(has_function_privilege('anon', f, 'execute')) as a from unnest(array['snowvill_my_villages()', 'snowvill_link_device(jsonb,jsonb)', 'snowvill_set_visibility(text,text)', 'snowvill_request_join(text,text)', 'snowvill_members_of(text)', 'snowvill_decide_member(text,uuid,boolean)']::regprocedure[]) f")[0]
    check("account functions are not granted to anon", r["a"] is False, r)
    r = sql("select bool_and(has_function_privilege('authenticated', f, 'execute')) as a from unnest(array['snowvill_get_village(text,text[])', 'snowvill_create_village(uuid,text)', 'snowvill_claim_house(uuid,text,integer,text,text,text,integer)', 'snowvill_report(uuid,uuid,text)', 'snowvill_upgrade_village(uuid,text,integer)', 'snowvill_wallet(uuid)']::regprocedure[]) f")[0]
    check("guest functions are granted to signed-in users", r["a"] is True, r)

    print("4. guest secrets and linking")
    g1 = call(None, f"snowvill_create_village({lit(uuid.uuid4())}::uuid, '손님 마을')")
    gv, gsecret = g1["id"], g1["owner_secret"]; villages.append(gv)
    h = call(None, f"snowvill_claim_house({lit(uuid.uuid4())}::uuid, {lit(gv)}, 0, '손님', 'brick', '', 0)")
    hid, hsecret = h["house"]["id"], h["claim_secret"]
    r = call(E, f"snowvill_link_device(jsonb_build_object({lit(gv)}, 'wrong'), '{{}}'::jsonb)")
    check("wrong secret links nothing", r.get("villages") == 0, r)
    r = call(E, f"snowvill_link_device(jsonb_build_object({lit(gv)}, {lit(gsecret)}), jsonb_build_object({lit(hid)}, {lit(hsecret)}))")
    check("guest village and house move to the account", r.get("villages") == 1 and r.get("houses") == 1, r)
    r = call(B, f"snowvill_link_device(jsonb_build_object({lit(gv)}, {lit(gsecret)}), '{{}}'::jsonb)")
    check("already-linked village is not taken over", r.get("villages") == 0, r)
    call(E, f"snowvill_set_visibility({lit(gv)}, 'private')")
    g = call(None, f"snowvill_get_village({lit(gv)}, array[{lit(hsecret)}])")
    check("guest with a claim secret still sees the private village", g["locked"] is False, g.get("locked"))
    r = call(None, f"snowvill_link_device('{{}}'::jsonb, '{{}}'::jsonb)")
    check("linking needs sign-in", err(r), r)

    print("5. account deletion")
    paths = sql(f"select count(*) as n from snowvill_delete_account({lit(E)}::uuid)")
    left = sql(f"select (select count(*) from snowvill_villages where id = {lit(gv)}) as v, (select count(*) from auth.users where id = {lit(E)}) as u")[0]
    check("owned village and the auth user are gone", left["v"] == 0 and left["u"] == 0, left)
    r = sql("select has_function_privilege('anon', 'snowvill_delete_account(uuid)', 'execute') as a, has_function_privilege('authenticated', 'snowvill_delete_account(uuid)', 'execute') as b")[0]
    check("delete_account is service-only", not r["a"] and not r["b"], r)
finally:
    ids = ",".join(lit(v) for v in villages) or "''"
    sql(f"delete from snowvill_villages where id in ({ids}); delete from snowvill_calls where install_id in ({','.join(lit(u) for u in users + [INSTALL])}); "
        f"delete from auth.users where id in ({','.join(lit(u) for u in users)})")
    left = sql(f"select (select count(*) from snowvill_villages where id in ({ids})) as v, (select count(*) from auth.users where id in ({','.join(lit(u) for u in users)})) as u")
    print("cleanup", left)
print(f"result: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
