#!/usr/bin/env bash
# Runs scripts/e2e-remote.mjs and then verifies on the server that the E2E village, its houses,
# reports and photos are gone (deleting leftovers if the browser run failed midway).
# Usage: CDP_URL=http://127.0.0.1:<port> BASE_URL=http://localhost:3100 scripts/e2e-remote.sh
set -u
cd "$(dirname "$0")/.."
REF=qfhbkfzxhldfycmcwntw
TOK=$(security find-generic-password -a mkideabox-games-mgmt-token -s supabase -w)
API="https://api.supabase.com/v1/projects/$REF"
q() { python3 -c "import json,sys;print(json.dumps({'query':sys.argv[1]}))" "$1" \
  | curl -s -m 60 -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d @- "$API/database/query"; }

OUT=$(node scripts/e2e-remote.mjs 2>&1); CODE=$?
echo "$OUT"
VID=$(echo "$OUT" | sed -n 's/^VILLAGE_ID=//p' | head -1)
[ -z "$VID" ] && exit $CODE

LEFT=$(q "select (select count(*) from snowvill_villages where id='$VID') as villages, (select count(*) from snowvill_houses where village_id='$VID') as houses, (select count(*) from storage.objects where bucket_id='snowvill-photos' and name like '$VID/%') as photos")
echo "server leftovers for $VID: $LEFT"
if [ "$LEFT" != '[{"villages":0,"houses":0,"photos":0}]' ]; then
  echo "cleaning up leftovers"
  SECRET=$(echo "$OUT" | sed -n 's/^OWNER_SECRET=//p' | head -1)
  ANON=$(curl -s -H "Authorization: Bearer $TOK" "$API/api-keys?reveal=true" | python3 -c "import json,sys;print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='anon'))")
  curl -s -X POST "https://$REF.supabase.co/functions/v1/snowvill-photo" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Content-Type: application/json" -d "{\"action\":\"delete_village\",\"install_id\":\"$(python3 -c 'import uuid;print(uuid.uuid4())')\",\"village_id\":\"$VID\",\"secret\":\"$SECRET\"}"; echo
  q "delete from snowvill_villages where id='$VID'"; echo
  CODE=1
fi
exit $CODE
