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
for m in migrations/20261109100000_snowvill_core.sql migrations/20261110100000_snowvill_big_village.sql migrations/20261111100000_snowvill_expansion.sql migrations/20261111120000_snowvill_districts.sql migrations/20261112100000_snowvill_village_look.sql; do
  "${PSQL[@]}" -v ON_ERROR_STOP=1 -f "$m" >/dev/null || { echo "migration failed: $m"; exit 1; }
done

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
ok "$(j "$G" "sorted(d.keys())")" "['capacity', 'created_at', 'decor', 'houses', 'id', 'name', 'open_halves', 'path_style']" "get_village exposes no secret/owner fields"
ok "$(j "$G" "d['capacity']")" 6 "new village is a free 6-house village"
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
ok "$(claim $B 60 "'x'" "'wood'" "''")" "ERR:22023" "slot 60 → 22023"
ok "$(j "$(claim $B 8 "'x'" "'wood'" "''")" "d['reason']")" SLOT_LOCKED "slot 8 in a 6-house village → SLOT_LOCKED"
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
ok "$(j "$(sql anon "select snowvill_get_village('$VID')")" "len(d['houses'])")" 6 "free village stops at 6 houses"
ok "$(j "$(claim $C 3 "'늦음'" "'wood'" "''")" "d['reason']")" VILLAGE_FULL "7th claim in a free village → VILLAGE_FULL"

echo "2b. expansion (tiered credits, +3 per step, up to 60)"
P=55555555-5555-5555-5555-555555555555
w() { sql anon "select snowvill_wallet('$1')"; }
up() { sql anon "select snowvill_upgrade_village('$1', '$2')"; }
cp() { sql service_role "select snowvill_credit_purchase('$1', '$2', '$3', 2900, 1.99, 'KRW', 'PLAY_STORE', 'SANDBOX')"; }
ok "$(j "$(w $P)" "d['credits'], d['tiers']['1']")" "(0, 0)" "empty wallet"
ok "$(j "$(up $P $VID)" "d['reason'], d['tier']")" "('NO_CREDIT', 1)" "6-house village needs a tier-1 credit"
ok "$(j "$(cp $P tx-1 snowvillage_big_village)" "d['credited'], d['tier']")" "(1, 1)" "big_village product → tier 1"
ok "$(j "$(cp $P tx-1 snowvillage_big_village)" "d['reason']")" DUPLICATE "same transaction again → no double credit"
ok "$(j "$(cp $P tx-x unknown_product)" "d['reason']")" UNKNOWN_PRODUCT "unknown product credits nothing"
ok "$(j "$(cp $P tx-2 snowvillage_expand_2)" "d['tier']")" 2 "expand_2 → tier 2"
ok "$(j "$(w $P)" "d['credits'], d['tiers']['1'], d['tiers']['2']")" "(2, 1, 1)" "wallet per tier"
ok "$(j "$(up $P $VID)" "d['ok'], d['capacity'], d['tier'], d['next_tier']")" "(True, 9, 1, 2)" "spend tier 1 → 9 (gift by a non-member)"
ok "$(j "$(up $P $VID)" "d['ok'], d['capacity'], d['next_tier']")" "(True, 12, 3)" "spend tier 2 → 12"
ok "$(j "$(up $P $VID)" "d['reason'], d['tier']")" "('NO_CREDIT', 3)" "12 needs tier 3"
cp $P tx-3 snowvillage_expand_3 >/dev/null
ok "$(j "$(up $P $VID)" "d['capacity'], d['next_tier']")" "(15, 4)" "tier 3 → 15"
for n in $(seq 4 18); do cp $P tx-4-$n snowvillage_expand_4 >/dev/null; done
for c in 18 21 24 27 30 33 36 39 42 45 48 51 54 57 60; do
  "${PSQL[@]}" -c "delete from snowvill_calls where install_id='$P'" >/dev/null  # test only: stay under the 10/min upgrade limit
  ok "$(j "$(up $P $VID)" "d['capacity']")" $c "tier 4 → $c"
done
"${PSQL[@]}" -c "delete from snowvill_calls where install_id='$P'" >/dev/null
ok "$(j "$(up $P $VID)" "d['reason']")" MAX_SIZE "60 is the maximum"
ok "$(j "$(w $P)" "d['tiers']['4']")" 0 "15 tier-4 credits spent"
for i in $(seq 1 11); do sql anon "select snowvill_upgrade_village('77777777-7777-7777-7777-777777777777', '$VID')" >/dev/null; done
ok "$(sql anon "select snowvill_upgrade_village('77777777-7777-7777-7777-777777777777', '$VID')")" "ERR:PT429" "upgrade rate limit (10/min) still applies"
ok "$("${PSQL[@]}" -c "select count(*) from snowvill_upgrades where village_id='$VID'")" 18 "one upgrade row per step"
for i in 6 30 59; do
  U=$(python3 -c "import uuid;print(uuid.uuid4())")
  ok "$(j "$(sql anon "select snowvill_claim_house('$U', '$VID', $i, 'b$i', 'brick', '', 2)")" "d['ok'], d['house']['direction'], d['house']['style']")" "(True, 2, 'brick')" "60-house village accepts slot $i with direction"
done
U=$(python3 -c "import uuid;print(uuid.uuid4())")
ok "$(sql anon "select snowvill_claim_house('$U', '$VID', 7, 'x', 'wood', '', 4)")" "ERR:22023" "direction 4 → 22023"
ok "$(sql anon "select snowvill_claim_house('$U', '$VID', 7, 'x', 'castle', '', 0)")" "ERR:22023" "unknown style → 22023"
ok "$(j "$(sql anon "select snowvill_claim_house('$U', '$VID', 7, 'x', 'windmill', '')")" "d['house']['direction']")" 0 "old 6-arg claim still works (direction 0)"
ok "$(j "$(cp $P tx-r snowvillage_expand_2)" "d['credits']")" 1 "another tier-2 purchase"
ok "$(j "$(sql service_role "select snowvill_refund_purchase('tx-r')")" "d['refunded'], d['tier'], d['credits']")" "(1, 2, 0)" "refund unspent → tier-2 credit removed"
ok "$(j "$(sql service_role "select snowvill_refund_purchase('tx-r')")" "d['refunded']")" 0 "refund twice → no-op"
ok "$(j "$(sql service_role "select snowvill_refund_purchase('tx-1')")" "d['credits']")" 0 "refund after spending → stays at 0"
ok "$("${PSQL[@]}" -c "select capacity from snowvill_villages where id='$VID'")" 60 "expansion survives refund"
Q=66666666-6666-6666-6666-666666666666
cp $P tx-t1 snowvillage_big_village >/dev/null; cp $P tx-t3 snowvillage_expand_3 >/dev/null
ok "$(j "$(sql service_role "select snowvill_transfer(array['$P']::uuid[], '$Q')")" "d['moved']")" 2 "transfer moves credits of every tier"
ok "$(j "$(w $Q)" "d['tiers']['1'], d['tiers']['3']")" "(1, 1)" "new id has both credits"
ok "$(j "$(w $P)" "d['credits']")" 0 "old id emptied"
for f in "snowvill_credit_purchase('$P','x','snowvillage_big_village',1,1,'KRW','x','x')" "snowvill_refund_purchase('x')" \
         "snowvill_transfer(array['$P']::uuid[], '$Q')" "snowvill_product_credits('x')" "snowvill_product_tier('x')" \
         "snowvill_step_tier(6::smallint)" "snowvill_valid_style('x')"; do
  ok "$(sql anon "select $f")" "ERR:42501" "anon $f denied"
done
for t in snowvill_wallets snowvill_purchases snowvill_upgrades snowvill_tier_credits; do
  ok "$(sql anon "select count(*) from $t")" "ERR:42501" "select $t denied"
done
ok "$(sql anon "select nextval('snowvill_upgrades_id_seq')")" "ERR:42501" "upgrades sequence denied"

echo "2c. districts (owner picks which district to open)"
R=$(sql anon "select snowvill_create_village('$A', '동네 마을')"); V3=$(j "$R" "d['id']")
ok "$(j "$(sql anon "select snowvill_get_village('$V3')")" "d['open_halves'], d['capacity']")" "(3, 6)" "new village: district 0 open (halves 0,1)"
U=$(python3 -c "import uuid;print(uuid.uuid4())")
ok "$(j "$(sql anon "select snowvill_claim_house('$U', '$V3', 12, 'x', 'wood', '', 0)")" "d['reason']")" SLOT_LOCKED "lot in a closed district → SLOT_LOCKED"
W=88888888-8888-8888-8888-888888888888
cp $W tx-d1 snowvillage_big_village >/dev/null; cp $W tx-d2 snowvillage_expand_2 >/dev/null; cp $W tx-d3 snowvillage_expand_3 >/dev/null
ok "$(j "$(sql anon "select snowvill_upgrade_village('$W', '$V3', 4)")" "d['ok'], d['capacity'], d['open_halves']")" "(True, 9, 259)" "open district 4 (first half: lots 24-26)"
ok "$(j "$(sql anon "select snowvill_claim_house('$U', '$V3', 25, 'x', 'wood', '', 0)")" "d['ok']")" True "lot 25 is open now"
U2=$(python3 -c "import uuid;print(uuid.uuid4())")
ok "$(j "$(sql anon "select snowvill_claim_house('$U2', '$V3', 27, 'y', 'wood', '', 0)")" "d['reason']")" SLOT_LOCKED "second half (27) still closed"
ok "$(j "$(sql anon "select snowvill_upgrade_village('$W', '$V3', 4)")" "d['ok'], d['capacity'], d['open_halves']")" "(True, 12, 771)" "district 4 again → its second half"
ok "$(j "$(sql anon "select snowvill_upgrade_village('$W', '$V3', 4)")" "d['reason']")" DISTRICT_OPEN "district 4 fully open"
ok "$(j "$(sql anon "select snowvill_upgrade_village('$W', '$V3', 0)")" "d['reason']")" DISTRICT_OPEN "district 0 is open from the start"
ok "$(sql anon "select snowvill_upgrade_village('$W', '$V3', 10)")" "ERR:22023" "district 10 → 22023"
ok "$(j "$(sql anon "select snowvill_upgrade_village('$W', '$V3')")" "d['ok'], d['district'], d['capacity']")" "(True, 1, 15)" "old 2-arg call opens the first incomplete district"
for f in "snowvill_popcount(3)" "snowvill_slot_open(3, 0)"; do
  ok "$(sql anon "select $f")" "ERR:42501" "anon $f denied"
done

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

echo "8. village look (path style + moved decorations, owner only)"
R=$(sql anon "select snowvill_create_village('$C', '꾸미기 마을')"); VL=$(j "$R" "d['id']"); OL=$(j "$R" "d['owner_secret']")
G=$(sql anon "select snowvill_get_village('$VL')")
ok "$(j "$G" "(d['path_style'], d['decor'])")" "('dirt', {})" "new village: dirt path, no moved decor"
ok "$(j "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'brick', '{\"plaza-bench\": [1.25, 2.5], \"d0-decor3\": [-3, 7.5]}')")" "d['ok']")" True "owner sets brick + 2 moved decorations"
G=$(sql anon "select snowvill_get_village('$VL')")
ok "$(j "$G" "(d['path_style'], d['decor']['plaza-bench'], d['decor']['d0-decor3'])")" "('brick', [1.25, 2.5], [-3, 7.5])" "look stored and returned"
ok "$(j "$(sql anon "select snowvill_set_village_look('$C', '$VL', 'wrong-secret', 'snow', '{}')")" "d['reason']")" FORBIDDEN "wrong secret → FORBIDDEN"
ok "$(j "$(sql anon "select snowvill_get_village('$VL')")" "d['path_style']")" brick "rejected change leaves the look"
ok "$(j "$(sql anon "select snowvill_set_village_look('$C', 'nope', '$OL', 'snow', '{}')")" "d['reason']")" NOT_FOUND "unknown village → NOT_FOUND"
ok "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'gold', '{}')")" "ERR:22023" "unknown path style → 22023"
ok "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'snow', '{\"cathedral\": [0, 0]}')")" "ERR:22023" "non-decoration id → 22023"
ok "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'snow', '{\"plaza-bench\": [0, 99]}')")" "ERR:22023" "coordinate out of range → 22023"
ok "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'snow', '{\"plaza-bench\": [\"a\", 1]}')")" "ERR:22023" "non-number coordinate → 22023"
ok "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'snow', '[]')")" "ERR:22023" "decor not an object → 22023"
ok "$(j "$(sql anon "select snowvill_set_village_look('$C', '$VL', '$OL', 'stones', '{}')")" "d['ok']")" True "reset decorations"
ok "$(j "$(sql anon "select snowvill_get_village('$VL')")" "(d['path_style'], d['decor'])")" "('stones', {})" "reset stored"
ok "$(sql anon "select snowvill_valid_decor('{}')")" "ERR:42501" "validator not callable by anon"
ok "$("${PSQL[@]}" -c "update snowvill_villages set path_style='gold' where id='$VL'" 2>&1 | grep -o 23514)" 23514 "column check rejects unknown style"

echo "result: $pass passed, $fail failed"
[ "$fail" = 0 ]
