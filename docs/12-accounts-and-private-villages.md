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

## Cutover from the shared project
1. Apply the schema to the new project; port `supabase/deploy.sh` (REF/token) and the live tests.
2. Copy rows (villages, houses, reports, moderation log, tier credits/purchases) and photo objects; check counts and
   a photo checksum per object.
3. Switch at once: web env (`NEXT_PUBLIC_SUPABASE_*`), app 1.1 `env/*.json`, RevenueCat webhook URL, moderation
   LaunchAgent (`supabase/moderation.py` REF/token).
4. Old project: writes return an error (app 1.0 shows its generic error; installs are near zero on launch day),
   reads stay until 1.1 is out, then the `snowvill_` objects are removed there.

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
