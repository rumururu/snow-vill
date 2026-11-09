#!/usr/bin/env bash
# Live check against mkideabox-games through the same path the web app uses (REST + anon key, Edge Function).
# Test villages are deleted at the end (Edge Function delete_village + SQL sweep by test install IDs).
# Usage: supabase/tests/live.sh   (keychain mkideabox-games-mgmt-token)
set -u
REF=qfhbkfzxhldfycmcwntw
URL=https://$REF.supabase.co
FN=$URL/functions/v1/snowvill-photo
TOK=$(security find-generic-password -a mkideabox-games-mgmt-token -s supabase -w)
API="https://api.supabase.com/v1/projects/$REF"
ANON=$(curl -s -H "Authorization: Bearer $TOK" "$API/api-keys?reveal=true" \
  | python3 -c "import json,sys;print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='anon'))")
W=$(mktemp -d)
uuid() { python3 -c "import uuid;print(uuid.uuid4())"; }
A=$(uuid); B=$(uuid); C=$(uuid); D=$(uuid)
mq() { python3 -c "import json,sys;print(json.dumps({'query':sys.argv[1]}))" "$1" \
  | curl -s -m 60 -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d @- "$API/database/query"; }
OWNERS=()
cleanup() {
  echo "cleanup"
  for pair in "${OWNERS[@]:-}"; do
    [ -z "$pair" ] && continue
    fncall "$(js "action=delete_village" "install_id=$D" "village_id=${pair%%:*}" "secret=${pair#*:}")" >/dev/null
  done
  local like="false"
  for v in "${VIDS[@]:-}"; do [ -n "$v" ] && like="$like or name like '$v/%'"; done
  mq "delete from snowvill_villages where created_by in ('$A','$B','$C','$D'); delete from snowvill_calls where install_id in ('$A','$B','$C','$D'); select (select count(*) from snowvill_villages where created_by in ('$A','$B','$C','$D')) as villages, (select count(*) from snowvill_calls where install_id in ('$A','$B','$C','$D')) as calls, (select count(*) from storage.objects where bucket_id='snowvill-photos' and ($like)) as photos"
  echo; rm -rf "$W"
}
VIDS=()
trap cleanup EXIT
pass=0; fail=0
ok() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "  ✅ $3"; else fail=$((fail+1)); echo "  ❌ $3 (expected [$2], got [$1]) ${4:-}"; fi; }
rpc() { curl -s -o "$W/body" -w "%{http_code}" -X POST "$URL/rest/v1/rpc/$1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d "$2"; }
fncall() { curl -s -o "$W/fbody" -w "%{http_code}" -X POST "$FN" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d "$1"; }
up() { curl -s -o "$W/fbody" -w "%{http_code}" -X POST "$FN" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -F "install_id=$1" -F "house_id=$2" -F "secret=$3" -F "file=@$4;type=image/jpeg"; }
# js key=value key:=raw-json … → JSON object (avoids bash brace expansion on "{a,b}")
js() { python3 -c "
import json,sys
d={}
for a in sys.argv[1:]:
    if ':=' in a: k,v=a.split(':=',1); d[k]=json.loads(v)
    else: k,v=a.split('=',1); d[k]=v
print(json.dumps(d, ensure_ascii=False))" "$@"; }
body() { cat "$W/body"; }
fbody() { cat "$W/fbody"; }
jb() { python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(eval(sys.argv[2]))" "$W/body" "$1"; }
jf() { python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(eval(sys.argv[2]))" "$W/fbody" "$1"; }

# Test images: 800x600 JPEG with EXIF GPS (must be stripped) and a PNG (must be rejected).
python3 - "$W" <<'PY'
import sys
from PIL import Image
w = sys.argv[1]
img = Image.new("RGB", (512, 512), (200, 140, 90))
exif = Image.Exif(); exif[0x010F] = "SnowTestCam"; exif[0x8825] = {1: "N", 2: (37.0, 33.0, 0.0)}
img.save(f"{w}/exif.jpg", "JPEG", quality=80, exif=exif.tobytes())
Image.new("RGB", (1600, 1200), (10, 20, 30)).save(f"{w}/big.jpg", "JPEG", quality=30)
img.save(f"{w}/x.png", "PNG")
PY
ok "$(grep -c SnowTestCam "$W/exif.jpg")" 1 "fixture JPEG carries EXIF"

echo "1. village + houses via RPC"
ok "$(rpc snowvill_create_village "$(js "p_install_id=$A" "p_name=라이브 검사 마을")")" 200 "create village" "$(body)"
VID=$(jb "d['id']"); OWNER=$(jb "d['owner_secret']"); OWNERS+=("$VID:$OWNER"); VIDS+=("$VID")
ok "$(rpc snowvill_get_village "$(js "p_village_id=$VID")")" 200 "get village"
ok "$(jb "d['name'], len(d['houses'])")" "('라이브 검사 마을', 0)" "empty village"
ok "$(rpc snowvill_get_village "$(js p_village_id=zzzzzzzzzz)")" 200 "unknown village 200"
ok "$(body)" null "unknown village → null"
claim() { rpc snowvill_claim_house "$(js "p_install_id=$1" "p_village_id=$VID" "p_slot:=$2" "p_nickname=$3" "p_style=$4" "p_message=$5")"; }
ok "$(claim $A 0 하늘 wood '첫 집')" 200 "claim slot 0"
ok "$(jb "d['ok']")" True "claim ok"
H0=$(jb "d['house']['id']"); RES=$(jb "d['claim_secret']")
ok "$(claim $B 0 도윤 sage '')" 200 "collision request"
ok "$(jb "d['reason']")" SLOT_TAKEN "same slot → SLOT_TAKEN"
ok "$(claim $B 8 x wood '')" 400 "slot 8 → 400"
ok "$(claim $B 1 x gold '')" 400 "style gold → 400"
ok "$(claim $B 1 "$(python3 -c "print('눈'*61)")" wood '')" 400 "61-char nickname → 400"
ok "$(claim $B 1 도윤 indigo '')" 200 "second friend claims slot 1"
H1=$(jb "d['house']['id']")

echo "2. direct access denied"
for t in snowvill_villages snowvill_houses snowvill_reports snowvill_calls; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/$t?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
  [ "$code" != 200 ] && ok x x "$t select denied ($code)" || ok "$code" 4xx "$t select denied"
done
for f in snowvill_house_access snowvill_set_photo snowvill_delete_village snowvill_rate_limit; do
  code=$(rpc $f '{}'); [ "$code" != 200 ] && ok x x "$f via anon denied ($code)" || ok "$code" 4xx "$f via anon denied"
done
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/storage/v1/object/list/snowvill-photos" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{"prefix":""}')
ok "$( [ "$code" = 200 ] && python3 -c "import json;print(len(json.load(open('/dev/stdin'))))" < <(curl -s -X POST "$URL/storage/v1/object/list/snowvill-photos" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{"prefix":""}') || echo 0)" 0 "anon bucket listing returns nothing ($code)"

echo "3. photo upload (Edge Function)"
ok "$(up $A $H0 "$RES" "$W/x.png")" 415 "PNG rejected" "$(fbody)"
ok "$(up $A $H0 "$RES" "$W/big.jpg")" 400 "1600px JPEG rejected" "$(fbody)"
ok "$(up $A $H0 "$OWNER" "$W/exif.jpg")" 403 "owner secret cannot upload to someone's house"
ok "$(up $A $H0 "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" "$W/exif.jpg")" 403 "wrong secret → 403"
ok "$(up $A $H0 "$RES" "$W/exif.jpg")" 200 "resident uploads JPEG" "$(fbody)"
rpc snowvill_get_village "$(js "p_village_id=$VID")" >/dev/null
ok "$(jb "[h['has_photo'] for h in d['houses']]")" "[True, False]" "has_photo flag"
ok "$(jb "any('photo_path' in h for h in d['houses'])")" False "photo path never exposed"
PATH0=$(mq "select photo_path from snowvill_houses where id='$H0'" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["photo_path"])')
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/storage/v1/object/public/snowvill-photos/$PATH0")
[ "$code" != 200 ] && ok x x "public URL blocked ($code)" || ok "$code" 4xx "public URL blocked"
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/storage/v1/object/authenticated/snowvill-photos/$PATH0" -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
[ "$code" != 200 ] && ok x x "anon direct object read blocked ($code)" || ok "$code" 4xx "anon direct object read blocked"

echo "4. photo view (signed URL)"
ok "$(fncall "$(js "action=view" "install_id=$C" "village_id=$VID" "house_id=$H0")")" 200 "view returns signed URL" "$(fbody)"
SIGNED=$(jf "d['url']")
ok "$(curl -s -o "$W/got.jpg" -w "%{http_code} %{content_type}" "$SIGNED")" "200 image/jpeg" "signed URL serves JPEG"
ok "$(grep -c SnowTestCam "$W/got.jpg")" 0 "stored photo has EXIF stripped"
ok "$(python3 -c "from PIL import Image;print(Image.open('$W/got.jpg').size)")" "(512, 512)" "stored photo still decodes (512x512)"
ok "$(fncall "$(js "action=view" "install_id=$C" "village_id=$VID" "house_id=$H1")")" 404 "house without photo → 404"
ok "$(fncall "$(js "action=view" "install_id=$C" "village_id=aaaaaaaaaa" "house_id=$H0")")" 404 "wrong village id → 404"
ok "$(fncall "$(js action=view install_id=not-a-uuid)")" 400 "malformed request → 400"
ok "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FN" -H "Content-Type: application/json" -d '{"action":"view"}')" 401 "no anon key → 401 (verify_jwt)"
ok "$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$FN" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST")" 204 "CORS preflight"

echo "5. replace + remove"
ok "$(up $A $H0 "$RES" "$W/exif.jpg")" 200 "replace photo"
ok "$(mq "select count(*) as n from storage.objects where bucket_id='snowvill-photos' and name like '$VID/$H0/%'" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["n"])')" 1 "old object deleted on replace"
ok "$(fncall "$(js "action=remove" "install_id=$B" "house_id=$H0" "secret=$(printf 'B%.0s' {1..32})")")" 403 "remove with wrong secret → 403"
ok "$(fncall "$(js "action=remove" "install_id=$A" "house_id=$H0" "secret=$OWNER")")" 200 "village owner removes house" "$(fbody)"
ok "$(mq "select count(*) as n from storage.objects where bucket_id='snowvill-photos' and name like '$VID/%'" | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["n"])')" 0 "removed house photo deleted from storage"

echo "6. report + rate limit"
ok "$(rpc snowvill_report "$(js "p_install_id=$C" "p_house_id=$H1" "p_reason=live test")")" 204 "report accepted"
last=0; for i in 1 2 3 4; do last=$(rpc snowvill_create_village "$(js "p_install_id=$D" "p_name=제한$i")"); [ "$last" = 200 ] && OWNERS+=("$(jb "d['id']"):$(jb "d['owner_secret']")") && VIDS+=("$(jb "d['id']")"); done
ok "$last" 429 "4th create in a minute → 429"

echo "7. delete village"
ok "$(fncall "$(js "action=delete_village" "install_id=$B" "village_id=$VID" "secret=$(python3 -c "print('C'*32)")")")" 403 "non-owner cannot delete village"
ok "$(fncall "$(js "action=delete_village" "install_id=$A" "village_id=$VID" "secret=$OWNER")")" 200 "owner deletes village"
rpc snowvill_get_village "$(js "p_village_id=$VID")" >/dev/null
ok "$(body)" null "deleted village is gone"

echo "result: $pass passed, $fail failed"
[ "$fail" = 0 ]
