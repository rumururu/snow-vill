#!/usr/bin/env bash
# Local SQL check for the snowvill_ core migration on a throwaway Postgres cluster (no Docker).
# Recreates Supabase's roles and default privileges (anon/authenticated get everything by default),
# so a missing REVOKE shows up as a failure. Usage: supabase/tests/local.sh
set -u
cd "$(dirname "$0")/.."
PORT=${SNOWVILL_TEST_PORT:-55433}
DIR=$(mktemp -d "${TMPDIR:-/tmp}/snowvill-pg.XXXXXX")
cleanup() { pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR"; }
trap cleanup EXIT

initdb -D "$DIR/data" -U postgres --auth=trust >/dev/null || exit 1
pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start -w >/dev/null || { cat "$DIR/log"; exit 1; }
PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -X -q -tA -v VERBOSITY=sqlstate)

"${PSQL[@]}" -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || exit 1
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema extensions; create extension pgcrypto schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
SQL
"${PSQL[@]}" -v ON_ERROR_STOP=1 -f migrations/20261109100000_snowvill_core.sql >/dev/null || { echo "migration failed"; exit 1; }

pass=0; fail=0
ok() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "  ✅ $3"; else fail=$((fail+1)); echo "  ❌ $3 (expected [$2], got [$1])"; fi; }
# sql ROLE QUERY → value, or "ERR:<sqlstate>"
sql() {
  local out
  out=$("${PSQL[@]}" -c "set role $1;" -c "$2" 2>&1)
  if [[ "$out" == *ERROR:* ]]; then echo "ERR:$(echo "$out" | grep -o 'ERROR: *[0-9A-Z]*' | head -1 | awk '{print $2}')"; else echo "$out"; fi
}
j() { python3 -c "import json,sys;d=json.loads(sys.argv[1]);print(eval(sys.argv[2]))" "$1" "$2"; }

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
C=33333333-3333-3333-3333-333333333333

echo "1. create / get"
R=$(sql anon "select snowvill_create_village('$A', '  눈송이'||chr(9)||'마을  ')")
VID=$(j "$R" "d['id']"); OWNER=$(j "$R" "d['owner_secret']")
ok "$(j "$R" "len(d['id'])==10 and len(d['owner_secret'])==32")" True "village id + 32-char owner secret"
G=$(sql anon "select snowvill_get_village('$VID')")
ok "$(j "$G" "d['name']")" "눈송이 마을" "name sanitized (tab → space, trimmed)"
ok "$(j "$G" "sorted(d.keys())")" "['created_at', 'houses', 'id', 'name']" "get_village exposes no secret/owner fields"
ok "$(sql anon "select snowvill_get_village('nonexistent') is null")" t "unknown village → null"
ok "$(sql anon "select snowvill_create_village('$A', '   ')")" "ERR:22023" "blank name → 22023"
ok "$(sql anon "select snowvill_create_village('$A', repeat('가', 21))")" "ERR:22023" "21-char name → 22023"
ok "$(sql anon "select snowvill_create_village(null, 'x')")" "ERR:22023" "missing install id → 22023"

echo "2. claim rules"
claim() { sql anon "select snowvill_claim_house('$1', '$VID', $2, $3, $4, $5)"; }
R=$(claim $A 0 "'하늘'" "'wood'" "'첫 집'||chr(10)||chr(10)||chr(10)||chr(10)||'안녕'")
ok "$(j "$R" "d['ok'] and len(d['claim_secret'])==32 and d['house']['slot']==0")" True "claim slot 0"
ok "$(j "$R" "d['house']['message']")" "$(printf '첫 집\n\n안녕')" "message keeps at most one blank line"
RESIDENT=$(j "$R" "d['claim_secret']"); H0=$(j "$R" "d['house']['id']")
ok "$(j "$R" "'claim_hash' in d['house'] or 'photo_path' in d['house']")" False "house json has no secret/path"
ok "$(j "$(claim $B 0 "'도윤'" "'sage'" "''")" "d['reason']")" SLOT_TAKEN "same slot → SLOT_TAKEN"
ok "$(j "$(claim $A 1 "'또'" "'sage'" "''")" "d['reason']")" ALREADY_JOINED "same install twice → ALREADY_JOINED"
ok "$(sql anon "select snowvill_claim_house('$B', 'nonexistent', 1, 'x', 'wood', '')" | python3 -c 'import json,sys;print(json.load(sys.stdin)["reason"])')" NOT_FOUND "unknown village → NOT_FOUND"
ok "$(claim $B 8 "'x'" "'wood'" "''")" "ERR:22023" "slot 8 → 22023"
ok "$(claim $B -1 "'x'" "'wood'" "''")" "ERR:22023" "slot -1 → 22023"
ok "$(claim $B 1 "'  '" "'wood'" "''")" "ERR:22023" "blank nickname → 22023"
ok "$(claim $B 1 "repeat('가',11)" "'wood'" "''")" "ERR:22023" "11-char nickname → 22023"
ok "$(claim $B 1 "'x'" "'gold'" "''")" "ERR:22023" "style gold → 22023"
ok "$(claim $B 1 "'x'" "'wood'" "repeat('눈',61)")" "ERR:22023" "61-char message → 22023"
ok "$(j "$(claim $B 1 "'<b>도윤</b>'" "'indigo'" "repeat('눈',60)")" "d['ok']")" True "60-char message ok, markup kept as text"
for i in 2 3 4 5 6 7; do
  U=$(python3 -c "import uuid;print(uuid.uuid4())")
  sql anon "select snowvill_claim_house('$U', '$VID', $i, 'n$i', 'sage', '')" >/dev/null
done
ok "$(j "$(sql anon "select snowvill_get_village('$VID')")" "len(d['houses'])")" 8 "8 houses"
ok "$(j "$(claim $C 3 "'늦음'" "'wood'" "''")" "d['reason']")" VILLAGE_FULL "9th claim → VILLAGE_FULL"

echo "3. concurrent claim of the last free slot"
R=$(sql anon "select snowvill_create_village('$B', '경쟁 마을')"); V2=$(j "$R" "d['id']")
X=$(python3 -c "import uuid;print(uuid.uuid4())"); Y=$(python3 -c "import uuid;print(uuid.uuid4())")
"${PSQL[@]}" -c "set role anon;" -c "begin; select snowvill_claim_house('$X', '$V2', 5, 'X', 'wood', ''); select pg_sleep(1.5); commit;" > "$DIR/a.out" 2>&1 &
sleep 0.4
RB=$(sql anon "select snowvill_claim_house('$Y', '$V2', 5, 'Y', 'wood', '')")
wait
ok "$(grep -o '"ok" : true' "$DIR/a.out" | head -1)" '"ok" : true' "first transaction wins"
ok "$(j "$RB" "d['reason']")" SLOT_TAKEN "second waits on the lock, then SLOT_TAKEN"

echo "4. anon cannot touch tables, sequences or internal functions"
for t in snowvill_villages snowvill_houses snowvill_reports snowvill_calls; do
  ok "$(sql anon "select count(*) from $t")" "ERR:42501" "select $t denied"
done
ok "$(sql anon "insert into snowvill_calls(install_id, action) values ('$A','x')")" "ERR:42501" "insert denied"
ok "$(sql anon "select nextval('snowvill_reports_id_seq')")" "ERR:42501" "sequence denied"
ok "$(sql authenticated "select count(*) from snowvill_houses")" "ERR:42501" "authenticated select denied"
for f in "snowvill_house_access('$H0', 'x')" "snowvill_village_access('$VID', 'x')" "snowvill_photo_path('$VID', '$H0')" \
         "snowvill_set_photo('$H0', 'x')" "snowvill_delete_house('$H0')" "snowvill_delete_village('$VID')" \
         "snowvill_rate_limit('$A', 'x', 1, 1)" "snowvill_new_secret()" "snowvill_hash('x')"; do
  ok "$(sql anon "select $f")" "ERR:42501" "anon $f denied"
done

echo "5. rate limits"
D=44444444-4444-4444-4444-444444444444
for i in 1 2 3; do sql anon "select snowvill_create_village('$D', 'r$i')" >/dev/null; done
ok "$(sql anon "select snowvill_create_village('$D', 'r4')")" "ERR:PT429" "4th create in a minute → PT429"
"${PSQL[@]}" -c "insert into snowvill_calls(install_id, action, at) values ('$D', 'old', now() - interval '2 days')" >/dev/null
sql anon "select snowvill_get_village('x')" >/dev/null
sql anon "select snowvill_claim_house('$D', 'nonexistent', 0, 'x', 'wood', '')" >/dev/null
ok "$("${PSQL[@]}" -c "select count(*) from snowvill_calls where action='old'")" 0 "call rows older than a day purged"

echo "6. reports"
ok "$(sql anon "select snowvill_report('$C', '$H0', '부적절한 사진')")" "" "report accepted"
ok "$("${PSQL[@]}" -c "select count(*) from snowvill_reports where house_id='$H0'")" 1 "report stored"
ok "$(sql anon "select snowvill_report('$C', '$H0', repeat('x', 201))")" "ERR:22023" "201-char reason → 22023"

echo "7. edge-function helpers (service_role)"
ok "$(j "$(sql service_role "select snowvill_house_access('$H0', '$RESIDENT')")" "d['role']")" resident "claim secret → resident"
ok "$(j "$(sql service_role "select snowvill_house_access('$H0', '$OWNER')")" "d['role']")" owner "owner secret → owner"
ok "$(j "$(sql service_role "select snowvill_house_access('$H0', 'wrong')")" "d['role']")" None "wrong secret → no role"
ok "$(sql service_role "select snowvill_village_access('$VID', '$OWNER')")" t "village owner check"
ok "$(sql service_role "select snowvill_village_access('$VID', '$RESIDENT')")" f "resident secret is not owner"
ok "$(sql service_role "select snowvill_set_photo('$H0', '$VID/a.jpg') is null")" t "first photo: no previous path"
ok "$(sql service_role "select snowvill_set_photo('$H0', '$VID/b.jpg')")" "$VID/a.jpg" "replace returns previous path"
ok "$(j "$(sql anon "select snowvill_get_village('$VID')")" "d['houses'][0]['has_photo']")" True "has_photo exposed, path not"
ok "$(sql service_role "select snowvill_photo_path('$VID', '$H0')")" "$VID/b.jpg" "photo path lookup scoped to village"
ok "$(sql service_role "select snowvill_photo_path('$V2', '$H0') is null")" t "house from another village → null"
ok "$(sql service_role "select snowvill_delete_village('$VID')")" "$VID/b.jpg" "delete village returns photo paths"
ok "$("${PSQL[@]}" -c "select count(*) from snowvill_houses where village_id='$VID'")" 0 "houses cascade-deleted"
ok "$("${PSQL[@]}" -c "select count(*) from snowvill_reports where house_id='$H0'")" 0 "reports cascade-deleted"

echo "result: $pass passed, $fail failed"
[ "$fail" = 0 ]
