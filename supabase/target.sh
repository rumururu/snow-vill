# Which Supabase project the snowvill scripts talk to (sourced by deploy.sh and tests/live.sh).
#   SNOWVILL_TARGET=shared     game-shared mkideabox-games (live until the cutover, docs/12-accounts-and-private-villages.md)
#   SNOWVILL_TARGET=dedicated  snow-village on account rumururu2 (sign-in and private villages)
case "${SNOWVILL_TARGET:-shared}" in
  shared)    REF=qfhbkfzxhldfycmcwntw; TOKEN_ACCOUNT=mkideabox-games-mgmt-token; SHARED_PROJECT=1 ;;
  dedicated) REF=hbpazldzkmkcawfppiiq; TOKEN_ACCOUNT=snow-village-mgmt-token;   SHARED_PROJECT=0 ;;
  *) echo "unknown SNOWVILL_TARGET=${SNOWVILL_TARGET}" >&2; exit 2 ;;
esac
TOK=$(security find-generic-password -a "$TOKEN_ACCOUNT" -s supabase -w)
API="https://api.supabase.com/v1/projects/$REF"
