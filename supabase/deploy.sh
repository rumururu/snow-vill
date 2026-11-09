#!/usr/bin/env bash
# Deploys Snow Village (snowvill_) to the shared mkideabox-games project via the Management API
# (never via `supabase login` — the CLI login on this Mac belongs to other projects), then runs live checks.
# Re-runnable: migrations are applied only when their objects are missing; the Edge Function is redeployed.
# Aborts if any non-snowvill object changes. Keychain (service supabase): mkideabox-games-mgmt-token.
set -eu
cd "$(dirname "$0")"
REF=qfhbkfzxhldfycmcwntw
TOK=$(security find-generic-password -a mkideabox-games-mgmt-token -s supabase -w)
API="https://api.supabase.com/v1/projects/$REF"
q() { python3 -c "import json,sys;print(json.dumps({'query':sys.argv[1]}))" "$1" \
  | curl -s -m 60 -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d @- "$API/database/query"; }

HASH="select md5(string_agg(x, '|' order by x)) as h, count(*) as n from (
  select 'r:'||proname||md5(prosrc)||coalesce(proacl::text,'') as x from pg_proc p join pg_namespace s on s.oid=p.pronamespace
    where s.nspname='public' and proname not like 'snowvill\_%'
  union all select 't:'||table_name||':'||column_name||data_type from information_schema.columns
    where table_schema='public' and table_name not like 'snowvill\_%'
  union all select 'b:'||id||public::text from storage.buckets where id <> 'snowvill-photos') q"
BEFORE=$(q "$HASH")

case "$(q "select count(*) as n from pg_tables where schemaname='public' and tablename='snowvill_villages'")" in
  *'"n":0'*) R=$(q "$(cat migrations/20261109100000_snowvill_core.sql)"); echo "core migration: $R" ;;
  *) echo "core tables exist, core migration skipped" ;;
esac
R=$(q "$(cat migrations/20261109100100_snowvill_photo_bucket.sql)"); echo "photo bucket: $R"

AFTER=$(q "$HASH")
[ "$BEFORE" = "$AFTER" ] && echo "other games unchanged ($AFTER)" || { echo "OTHER OBJECTS CHANGED: $BEFORE -> $AFTER"; exit 1; }

curl -s -m 120 -o /dev/null -w 'edge function deploy HTTP%{http_code}\n' -X POST "$API/functions/deploy?slug=snowvill-photo" \
  -H "Authorization: Bearer $TOK" \
  -F 'metadata={"entrypoint_path":"index.ts","name":"snowvill-photo","verify_jwt":true};type=application/json' \
  -F "file=@functions/snowvill-photo/index.ts;filename=index.ts;type=application/typescript" \
  -F "file=@functions/snowvill-photo/jpeg.ts;filename=jpeg.ts;type=application/typescript"
sleep 8
bash tests/live.sh
