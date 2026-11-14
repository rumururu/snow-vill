---
slug: snow-village-accounts-private-villages
status: active
updated: 2026-11-14
---

# Snow Village — sign-in, private villages and the dedicated server (owner decisions 2026-11-14)

## Why
Ownership today is a random secret kept on one device (browser localStorage / app storage). A village made on the web
is a guest village in the app, in another browser, after a reinstall or after clearing site data, and the web has no
"my villages" list at all. The owner asked for sign-in and for private sharing.

## Decisions (owner, 2026-11-14)
| Topic | Decision |
|---|---|
| Who signs in | **Optional.** Invited friends still join from a link without an account. Signing in keeps my villages and my houses across web, app and devices; anything made as a guest moves to the account at sign-in. |
| Providers | **Google + Apple** (company standard: native SDK + `signInWithIdToken` in the app; Supabase OAuth redirect on the web). Apple is mandatory on iOS once Google is offered. |
| Private sharing | **Per village, public or private.** Public = today (anyone with the link sees and joins). Private = the link opens a "request to join" screen; only people the owner approved see the village, messages and photos. Approved people must be signed in. |
| Server | **New dedicated Supabase project** (corp rule: no Supabase Auth on the shared game project). Account `rumururu2@gmail.com`, org `rumururu2` (`kwonxirzhamdflctylkq`), project `snow-village`, ref `hbpazldzkmkcawfppiiq`, ap-northeast-2 (Seoul, same as today). Keychain (service `supabase`): `snow-village-mgmt-token`, `snow-village-db-password`. |

## Target design
- **Same schema, new home.** The `snowvill_` migrations move as they are (keeps the diff small); the guest model
  (install id + owner/claim secrets, SHA-256 on the server) stays for guests.
- **Accounts.** Supabase Auth users. `snowvill_villages.owner_user` and `snowvill_houses.user_id` (nullable).
  Every RPC accepts either the existing secret or the caller's JWT (`auth.uid()`).
- **Linking guest data.** On sign-in the client sends the secrets it holds; `snowvill_link_device` checks each hash
  and sets `owner_user` / `user_id`. A village or house already bound to another account is not taken over.
- **My villages.** Signed in: `snowvill_my_villages()` (owned, lived in, approved). Guest: the local list
  (web gets the same "내 마을" list the app has).
- **Private villages.** `snowvill_villages.visibility` (`public` default | `private`).
  `snowvill_members(village_id, user_id, status: pending|approved, nickname, created_at)`.
  For a private village `get_village` returns only the name and the caller's request state unless the caller is the
  owner, an approved member, or holds a valid claim secret for a house there (existing residents keep access).
  The photo function applies the same check before signing a URL. Share cards and link previews of a private
  village show neither name nor houses.
- **Account deletion** in the app and on the web (Apple 5.1.1(v), Play account-deletion URL): deletes the account and
  everything it owns (villages → houses → photos) in one function, same path as today's village deletion.

## Sign-in setup (done 2026-11-14)
| Piece | Value |
|---|---|
| Google Cloud | project `snow-village-mkideabox` (#326320694955, account mkideabox@gmail.com). Consent screen "Snow Village", External, **in production**, home page + privacy link, authorized domain `mkideabox.com`, no logo (no brand verification), basic scopes only |
| Google clients | web `326320694955-6ltlbk16iv6knc29agfmjevp6bopa8oi` (JS origins snow.mkideabox.com, workers.dev, localhost; secret in keychain `snow-village-google-web-secret`/`google-oauth`), iOS `326320694955-0ovsn0vsf9mqlf65v3nk8ta5ijt7epng`, Android × 3 (Play app signing `DC:C5…F0:94`, upload `EE:70…51:8D`, debug `6E:82…2E:12`) |
| Apple | App ID `com.mkideabox.snowvillage`: Sign in with Apple on (team 3SAMRT9KZD). Services ID `com.mkideabox.snowvillage.web` (domains snow.mkideabox.com, hbpazldzkmkcawfppiiq.supabase.co; return URLs `https://snow.mkideabox.com/`, `https://hbpazldzkmkcawfppiiq.supabase.co/auth/v1/callback`). Key `7W98CY35QQ` (.p8 only in keychain `snow-village-apple-signin-key`/`apple-signin`, base64) |
| Supabase Auth | `supabase/auth_config.py` (re-runnable): Google + Apple on, email/phone/anonymous off, site URL + redirect allow list (web origins, `com.mkideabox.snowvillage://login-callback`). **Apple client secret expires 2027-05-12 — rerun the script before then** |
| Flows | Web: Google Identity Services and Sign in with Apple JS return an id token → `signInWithIdToken`. iOS: native Google/Apple → `signInWithIdToken`. Android: native Google → `signInWithIdToken`; Apple via Supabase OAuth redirect (Services ID) back to `com.mkideabox.snowvillage://login-callback` |

## Client contract (server done 2026-11-14: migration `20261114100000_snowvill_accounts.sql`, `functions/snowvill-photo`)
Base URL `https://hbpazldzkmkcawfppiiq.supabase.co`; `apikey` header is always the public anon key.
Signed in → `Authorization: Bearer <access_token>`; guest → `Authorization: Bearer <anon key>` (as today).

**Auth (GoTrue REST, `/auth/v1`)**
- `POST /token?grant_type=id_token` `{provider: "google"|"apple", id_token, nonce?}` → session
  `{access_token, refresh_token, expires_in, expires_at, user: {id, email, app_metadata.provider, user_metadata}}`.
- `POST /token?grant_type=refresh_token` `{refresh_token}` → new session (refresh before `expires_at`).
- `POST /logout` with the access token.
- Android Apple only: OAuth PKCE redirect via `/authorize?provider=apple&redirect_to=com.mkideabox.snowvillage://login-callback`.

**RPCs (`/rest/v1/rpc/<fn>`)**
| Function | Args | Returns / notes |
|---|---|---|
| `snowvill_get_village` | `p_village_id`, `p_secrets` (text[], optional: the guest's owner + claim secrets for this village) | adds `visibility`, `locked`, `me {role: owner\|resident\|member\|pending\|null, house_id}`. `locked: true` → only `{id, name, visibility, locked, me}` |
| `snowvill_link_device` | `p_owner` `{villageId: ownerSecret}`, `p_houses` `{houseId: claimSecret}` | `{villages, houses}` moved to the account (signed in only; call right after sign-in, then drop nothing locally) |
| `snowvill_my_villages` | — | `[{id, name, capacity, visibility, created_at, role, houses, pending}]` (signed in only) |
| `snowvill_set_visibility` | `p_village_id`, `p_visibility` `public\|private` | `{ok, reason?: FORBIDDEN}` — signed-in owner only |
| `snowvill_request_join` | `p_village_id`, `p_nickname` (1–10) | `{ok, role}`; private villages, signed in |
| `snowvill_members_of` | `p_village_id` | owner: `[{user_id, nickname, status: pending\|approved, created_at}]`, others `null` |
| `snowvill_decide_member` | `p_village_id`, `p_user_id`, `p_approve` | approve or remove (reject / remove member) |
| `snowvill_set_village_look` | as before; `p_owner_secret` may be `null` for a signed-in owner | |
| `snowvill_claim_house` | as before | private village and not owner/approved → HTTP 403 (401 for a guest: PostgREST answers the anon role that way); a second house for the same account → HTTP 409 |

**Edge Function `snowvill-photo`**: with a user token the `secret` fields are optional (upload, remove, delete_village).
`view` takes optional `secrets: string[]` (guests of a private village). New `delete_account`
`{install_id, apple_code?, apple_client?: "web"|"app"}` — a fresh Sign in with Apple authorization code lets the
server revoke the Apple grant; then the account, its villages, its houses and their photos are deleted.

## Cutover from the shared project (runbook)
Prepared and **run 2026-11-14 (22:35–23:00 KST)**: shared writes frozen first (only `get_village`, `wallet` remain
callable), then the fresh copy (5 villages, 4 houses, 2 wallets, 4 purchases, 2 tier credits, 0 photos; row hashes
identical on both sides), web switched and deployed (CSP updated for the new host and Google/Apple sign-in — the first
deploy without it failed to load villages and was fixed within minutes), RevenueCat webhook moved, report alerts on
the new project, app builds with `env/prod.json` → dedicated. Scripts now default to `dedicated`.
**Do not deploy the web before step 2**: since commit `web sign-in` the web sends `p_secrets` to `snowvill_get_village`,
which the shared project does not have (guests would get errors).
1. Final copy: `python3 supabase/migrate_data.py --fresh` (empties the target's copied tables first — refused once any
   account-linked row exists; then copies rows with matching hashes and every photo with an MD5 check). Re-check
   counts in its output. Already proven: owner/claim hashes and purchases identical on both sides.
2. Web: set `EFFECTIVE_DATE` in `src/app/privacy/policy/shared.tsx` to the cutover day (the policy text for
   sign-in and private villages is already in all 10 languages); `.env.local` → `NEXT_PUBLIC_SUPABASE_URL=https://hbpazldzkmkcawfppiiq.supabase.co` + that project's anon key;
   `npm run deploy`.
3. RevenueCat webhook `whintgre12bd5d2fe714ce9a01feb1a79a57b25` → `https://hbpazldzkmkcawfppiiq.supabase.co/functions/v1/snowvill-purchase-webhook`
   (`POST https://api.revenuecat.com/v2/projects/projeb9d0302/integrations/webhooks/<id>` with `{"url": …}`, keychain
   `snowvillage-revenuecat-secret`). Same Authorization secret (`SNOWVILL_WEBHOOK_AUTH`) is already set on the new project.
4. Freeze the shared project: run `supabase/cutover/freeze_shared.sql` there (app 1.0 keeps reading, writes refused).
5. Report alerts: set `SNOWVILL_TARGET=dedicated` in `supabase/launchd/com.mkideabox.snowvill-reports.plist`
   (EnvironmentVariables), reinstall the LaunchAgent; scripts default to `shared` until then (`supabase/target.sh`).
6. App 1.1: `mobile/env/prod.json` `SUPABASE_URL`/`SUPABASE_ANON_KEY` → dedicated; build and submit both stores.
7. After 1.1 is live everywhere: flip the script default to `dedicated`, then drop the `snowvill_` objects from the
   shared project (separate approval).
Already done on the new project: schema + both Edge Functions, Apple key secrets, CORS origins secret.

## Store and policy changes (ship with app 1.1)
- Privacy policy (10 languages): account data (email and name from Google/Apple, user id), private villages,
  deletion.
- App Store privacy: add Email Address and User ID (app functionality, linked, no tracking). Sign in with Apple
  capability on `com.mkideabox.snowvillage`. Review note: sign-in is optional.
- Play data safety: add email address and user IDs; account creation via Google/Apple; account deletion URL.

## Work order
| Step | Content | Needs the owner |
|---|---|---|
| 1 | Schema + deploy script + live tests on the new project | — |
| 2 | ~~Google OAuth clients, Apple Services ID + key, Supabase Auth providers~~ done 2026-11-14 (above) | — |
| 3 | Web sign-in, account linking, "내 마을" list, account deletion | — |
| 4 | App sign-in (native Google/Apple), linking, account deletion | — |
| 5 | Private villages: visibility toggle, join request / approve, access checks, share card | — |
| 6 | Data copy + cutover (web deploy, app 1.1 build) | approve cutover time |
| 7 | Policy pages, store forms, app review (the 1.0 App Store submission was withdrawn 2026-11-14 on the owner's request, to ship with sign-in) | approve submission |
