---
slug: snow-village-store-iap-setup
status: active
updated: 2026-11-10
---

# Snow Village — store, in-app purchase and RevenueCat setup

What was actually created (IDs, prices, where keys live — names only, never values) and how to re-run it.
Pattern follows `claires-space/docs/release/IAP_SETUP.md` and `ldm-unity/docs/release_procedure/IAP_SETUP.md`.
Product model and why: `09-decisions.md` (free villages 6 houses, paid "big village" 8).

## 1. Products (village expansion steps)

Consumables, same ids everywhere (app `tierProduct`, RevenueCat offering `default` packages, App Store, Google Play,
server `snowvill_product_tier()`). Each opens 3 lots of a district the buyer picks (docs/11-village-expansion-plan.md).

| Product id | Step | App Store (base KOR) | Google Play | ASC IAP | RevenueCat iOS / Play product | RC package |
|---|---|---|---|---|---|---|
| `snowvillage_big_village` | 6 → 9 | ₩2,900 (US$1.99) | ₩2,900 / US$1.99 | 6832824105 | prodfa2b1e56ee / prod6b9a86684b | pkgecc8b0777c5 |
| `snowvillage_expand_2` | 9 → 12 | ₩6,900 (US$3.99) | ₩6,900 / US$3.99 | 6833285847 | prod53f60c16eb / prod7bad616f2f | pkge1c5e3056c4 |
| `snowvillage_expand_3` | 12 → 15 | ₩12,900 (US$7.99) | ₩12,900 / US$7.99 | 6833285856 | prod2e4bf5bac5 / prod8d8a0fd2b6 | pkgec27bcd78e9 |
| `snowvillage_expand_4` | 15 → 18 … → 60 | **₩25,900** (US$14.99) | ₩25,900 / US$14.99 | 6833286030 | prod2871387635 / prod06bbdc3f3d | pkge8829cd10c1 |

- The App Store has no ₩25,800 price point (nearest 25,500 / 25,900), so the owner set ₩25,900 on both stores (2026-11-11).
- ASC state: MISSING_METADATA until each product's review screenshot is attached (submitted with the first app version).
- Play: all 4 purchase options ACTIVE, 174 regions, backwards compatible. Scripts: `mobile/tools/store/asc_iaps.py`,
  `mobile/tools/store/play_iaps.py --activate` (both idempotent).

## 2. App Store Connect

| Item | Value |
|---|---|
| Bundle id | `com.mkideabox.snowvillage` (bundleId resource `HY2BMR5FR6`), team `3SAMRT9KZD` |
| App | `6832823869` "Snow Village", SKU `snowvillage`, primary language Korean |
| IAPs | see §1; consumables, ko/en names "마을 넓히기 N단계" / "Village +3 (step N)"; review note: village menu ⋮ → 마을 넓히기 → pick a district |
| IAP state | `MISSING_METADATA` until the **review screenshot** (purchase sheet) is attached. The first IAP must be submitted together with the first app version |
| TestFlight | builds 1 (Flutter placeholder icon), 2 (real icon), 3 (RevenueCat keys) — lane `mobile/ios/fastlane` `beta` |
| Apple server notifications | **Registered 2026-11-10**: RevenueCat's URL (revealed after the owner entered the RevenueCat password) set via `PATCH /v1/apps/6832823869` for production and sandbox, version V2 (confirmed by GET). The URL token is a secret and is not written down |

Scripts (run from `mobile/`): `tools/store/asc.py` (API helper, key `DGS7ANBS8T`, `.p8` beside the iOS Fastfile, gitignored),
`tools/store/asc_iaps.py` (idempotent product creation).

## 3. Google Play

| Item | Value |
|---|---|
| App | `4974954907414864233`, package `com.mkideabox.snowvillage`, app, free, default language ko-KR |
| Internal testing | track `4700181973142712605`, release versionCode 2 (1.0.0) **rolled out 2026-11-10**, testers = lists "Gold Frontier testers" + "Cake Cut internal testers" (both license-test lists; the latter has mkideabox.app@gmail.com). Opt-in: `https://play.google.com/apps/internaltest/4700181973142712605` |
| One-time products | see §1; purchase option `default` (buy, **backwards compatible** — needed by RevenueCat/Billing), first one made in the console 2026-11-10, the others by `play_iaps.py` 2026-11-11 |
| Upload key | `mobile/android/app/snowvillage-release.jks` alias `snowvillage`; password in keychain account `snowvillage-upload-key`, service `android-keystore`; `mobile/android/key.properties` (gitignored). **Back up the keystore** — losing it needs an upload key reset |
| Service account | `mobile/android/fastlane/play-store-key.json` (company `fastlane-play-store@quick-cable-…`, gitignored). Snow Village added to its **app permissions as admin (all 13), same as nametree** on 2026-11-10 — before that uploads worked (account-level) but product/pricing/purchase APIs returned 403/401 and RevenueCat could not validate. After granting, the purchase API only started answering once a product was re-saved (`PATCH …/onetimeproducts/…?updateMask=listings`) |

Lane: `mobile/android/fastlane` `internal` (`draft:true` was needed while the app was a draft app; now `completed` works).

## 4. RevenueCat

| Item | Value |
|---|---|
| Project | "Snow Village" `projeb9d0302` (dashboard `projects/eb9d0302`), category Social Networking |
| App Store app | `appa64e95d869` "Snow Village (iOS)". In-App Purchase key and ASC API key = account team key `DGS7ANBS8T`, both **Valid credentials** |
| Play app | `app158a473529` "Snow Village (Android)". Service account JSON = the **company ldm service account** (`fastlane-play-store-deploy@project-da4ee1b7-…`, account-level Play admin, Pub/Sub admin on the RTDN project) — the same credential the other RevenueCat apps use. Valid credentials. (The quick-cable key worked for validation after the Play grant, but RevenueCat only lists Pub/Sub topics from the key's own GCP project, so RTDN needs the ldm key) |
| Products | see §1 (8 products: 4 tiers × iOS/Play, consumable) |
| Entitlement | none (consumable credit counted by the server wallet) |
| Offering | `default` `ofrnga4d4c51bc6` (current), 4 packages (lookup_key = product id), each with the iOS and Play product |
| Webhook | `whintgre12bd5d2fe714ce9a01feb1a79a57b25` → `https://qfhbkfzxhldfycmcwntw.supabase.co/functions/v1/snowvill-purchase-webhook`, production + sandbox, all events, Authorization = keychain `snowvill-webhook-auth` (service `supabase`) = Supabase secret `SNOWVILL_WEBHOOK_AUTH` |
| Public SDK keys | in `mobile/env/prod.json` (`REVENUECAT_IOS_KEY` `appl_…`, `REVENUECAT_ANDROID_KEY` `goog_…`; public values but the file is gitignored with the Supabase anon key) |
| v2 secret key | `claude-setup-v2`: project configuration read & write, customer information read only. Keychain account `snowvillage-revenuecat-secret`, service `revenuecat`. Lower it to read-only once setup is final (claires-space/ldm did) |
| Google developer notifications (RTDN) | **Connected 2026-11-10** to the shared topic `projects/project-da4ee1b7-3fcf-4373-815/topics/Play-Store-Notifications` (RevenueCat created its subscription). Play Console app → 수익 창출 설정: real-time notifications on, same topic, "정기 결제, 무효화된 구매, 모든 일회성 제품". Play test notification received (13:17 UTC). A temporary Pub/Sub admin grant to the quick-cable key on that project was removed again (`gcloud … remove-iam-policy-binding`) |

Query: `GET https://api.revenuecat.com/v2/projects/projeb9d0302/{apps|products|offerings}` (Bearer = keychain key above).

## 5. Build notes

- `purchases_flutter` is pinned to **10.15.2**: 11.x needs the `PurchasesHybridCommon` 20.x pod, which is not on CocoaPods
  trunk yet (trunk freeze). CocoaPods trunk becomes read-only on 2026-12-02; the next RevenueCat major drops CocoaPods →
  move the iOS app to Swift Package Manager before upgrading.
- iOS deployment target is 15.0 (Xcode 27 minimum). The iOS lane runs flutter/pod in a clean Ruby env (fastlane's Ruby
  breaks CocoaPods) and ignores altool's harmless `CDUploaderStateInfoResumeFilePath` notice after "UPLOAD SUCCEEDED".
- App icon / adaptive icon / launch image come from the original house art (`mobile/assets/icon/`, `flutter_launcher_icons`).

## 6. Verified (2026-11-10, SM M205N, Play internal-test install versionCode 2, license tester mkideabox.app@gmail.com)

Upgrade sheet shows the Play price ₩2,900 → test card purchase → RevenueCat → webhook wrote `snowvill_purchases`
(order `GPA.3371-0939-…`, KRW 2900, PLAY_STORE, SANDBOX) → the app spent the credit (`snowvill_upgrades` 1 row, wallet 0)
→ test village "QA IAP test 2" capacity 6 → 8, screen "0/8". Refund requested with Play `orders:refund?revoke=true` (204);
the refund webhook depends on RevenueCat noticing the refund (RTDN not connected yet) — check `refunded_at` later.

An earlier purchase on SM G525N (before the permission grant) was charged by Play but never reached RevenueCat;
unacknowledged, so Google refunds it automatically within 3 days.

### iOS (2026-11-10, shared iPad, TestFlight build 3, internal tester rumururu@gmail.com)

TestFlight setup: builds 1–3 answered "no non-exempt encryption" (API), `ITSAppUsesNonExemptEncryption=false` added to
Info.plist for later builds, internal group "내부 테스트" (all builds) with rumururu@gmail.com (same as ctw / claires-space).
Upgrade sheet showed US$1.99 (device storefront) → Apple sheet "테스트 전용… 청구되지 않습니다" ₩2,900 → owner confirmed with the
side button → webhook wrote `snowvill_purchases` (APP_STORE, SANDBOX, KRW 2900), wallet 1. The app had been closed while the
purchase sheet was open (the UI-test run ended), so it did not spend the credit right away; on reopening, the sheet offered
"보유한 이용권으로 키우기" and that turned "QA 아이패드" from capacity 6 to 8 (screen "0/8", wallet 0). This is the intended
recovery path for a purchase that finishes while the app is gone. iOS refund not tested (no sandbox refund API).

Test data to remove after the refund check: villages "QA IAP test" (capacity 6), "QA IAP test 2" (capacity 8) and "QA 아이패드" (capacity 8) and their purchase/upgrade rows.

## 7. Remaining

| To do | Who | Note |
|---|---|---|
| Refund round trip with RTDN on: the first refund (`GPA.3371-0939-…`) was issued **before** RTDN was connected, so its notification was lost (`refunded_at` still null). Buy once more, refund, confirm `refunded_at`; then delete test data | Claude | needs a free phone with the tester account (M205N / G525N; the Note9 has no Google account) |
| ASC review screenshot for the IAP | Claude | before submitting for review |
| ~~Play app content forms, data safety, store settings, production countries~~ done 2026-11-12 (see §8) | Claude | — |
| ~~Play: production release 1.0.0 (build 8) sent for review~~ 2026-11-12; build 9 + new store images published 2026-11-14 (live in 178 countries) | Claude | done |
| ~~ASC reviewer contact~~ set 2026-11-12 (company standard contact, passed as `REVIEW_*` env to `tools/store/listing.py`, not stored in the repo) | Claude | |
| ~~ASC: submit for review~~ submitted 2026-11-14: version 1.0 (build 10) + 4 consumables in one submission, WAITING_FOR_REVIEW. Age rating, content rights and free price set through the API; App Privacy published in the web UI (name, photos, other user content, device ID, purchase history, product interaction — all app functionality, linked, no tracking); the first consumable can only be added to the version's submission from the IAP page ("심사에 추가" → the draft), the API returns FIRST_CONSUMABLE_MUST_BE_SUBMITTED_ON_VERSION | Claude | review ≤ 48 h |
| Report handling built 2026-11-12 (`supabase/migrations/20261113100000_snowvill_moderation.sql`, `supabase/moderation.py`, LaunchAgent `supabase/launchd/com.mkideabox.snowvill-reports.plist`): deployed 2026-11-13 (live tests 86/86); one real alert mail verified end to end (report → `check` mail in the operator inbox → `remove`, test data cleaned). LaunchAgent installed 2026-11-14 (first run exit 0, `no new reports`; logs in `~/Library/Logs/mkideabox/snowvill-reports/`) | Claude | done |
| Lower the RevenueCat v2 key to read-only | Claude | after setup |

## 8. Play app content and first production release (2026-11-12, sent for review)

| Declaration | Answer |
|---|---|
| Privacy policy | https://snow.mkideabox.com/privacy/ |
| Login details (app access) | No restricted parts (no accounts; expansion is a plain in-app purchase) — same as Claire's Ranch |
| Ads / Advertising ID | No / No (release manifest has no `AD_ID`: INTERNET, ACCESS_NETWORK_STATE, BILLING only) |
| Content rating (IARC, contact mkideabox.feedback@gmail.com) | Social/communication → communication with people you know; no location sharing; digital purchases yes, no loot boxes; no blocking, reporting yes; no chat; interaction limited to invited friends. Result: IARC 12+, ESRB Everyone, PEGI parental guidance, USK 0, ClassInd 14, KR 12+ |
| Target audience | 16–17, 18+ (policy: not for under-14s) |
| Data safety | Collected, none shared, encrypted in transit, no accounts, deletion via https://snow.mkideabox.com/privacy/. Name (nickname, optional, app functionality); purchase history (required, app functionality); photos (optional, app functionality); app interactions (request log, required, fraud/security); other UGC (village name / message, optional, app functionality); device or other IDs (random install ID, required, app functionality + fraud/security) |
| Government / financial / health | None |
| Trader status | Yes (company account), no terms URL |
| Store settings | App, category Social; contact mkideabox.feedback@gmail.com, website https://snow.mkideabox.com/ |
| Production countries | All 177 + rest of world (178 rows targeted) |
| Child safety standards (required for the Social category; found by the pre-review check) | https://snow.mkideabox.com/child-safety/ (10 languages, `src/app/child-safety`); contact = developer account email; in-app reporting and legal-compliance attestations checked |
| Production release | 1.0.0 (version code 8), full rollout, release notes in 10 languages; created as a draft through the API (draft app), sent for review in the console 2026-11-12 |
