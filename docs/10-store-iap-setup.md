---
slug: snow-village-store-iap-setup
status: active
updated: 2026-11-10
---

# Snow Village — store, in-app purchase and RevenueCat setup

What was actually created (IDs, prices, where keys live — names only, never values) and how to re-run it.
Pattern follows `claires-space/docs/release/IAP_SETUP.md` and `ldm-unity/docs/release_procedure/IAP_SETUP.md`.
Product model and why: `09-decisions.md` (free villages 6 houses, paid "big village" 8).

## 1. Product

One consumable, same id everywhere (app `bigVillageProductId`, RevenueCat offering `default`, App Store, Google Play,
server `snowvill_product_credits()`).

| Product id | Meaning | App Store | Google Play |
|---|---|---|---|
| `snowvillage_big_village` | 1 "big village" credit (a village holds 8 houses instead of 6) | KRW 2,900 base price (KOR base territory), USD 1.99 by Apple equalization, all territories | KRW 2,900, USD 1.99 (set manually), other regions converted from KRW 2,900, 174 regions |

## 2. App Store Connect

| Item | Value |
|---|---|
| Bundle id | `com.mkideabox.snowvillage` (bundleId resource `HY2BMR5FR6`), team `3SAMRT9KZD` |
| App | `6832823869` "Snow Village", SKU `snowvillage`, primary language Korean |
| IAP | `6832824105`, consumable, ko "큰 마을" / en-US "Big Village", review note explains where the purchase is (village menu ⋮ → 큰 마을로 키우기) |
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
| One-time product | `snowvillage_big_village`, purchase option `default` (buy, **backwards compatible** — needed by RevenueCat/Billing), digital content, created and activated in the console 2026-11-10 |
| Upload key | `mobile/android/app/snowvillage-release.jks` alias `snowvillage`; password in keychain account `snowvillage-upload-key`, service `android-keystore`; `mobile/android/key.properties` (gitignored). **Back up the keystore** — losing it needs an upload key reset |
| Service account | `mobile/android/fastlane/play-store-key.json` (company `fastlane-play-store@quick-cable-…`, gitignored). Snow Village added to its **app permissions as admin (all 13), same as nametree** on 2026-11-10 — before that uploads worked (account-level) but product/pricing/purchase APIs returned 403/401 and RevenueCat could not validate. After granting, the purchase API only started answering once a product was re-saved (`PATCH …/onetimeproducts/…?updateMask=listings`) |

Lane: `mobile/android/fastlane` `internal` (`draft:true` was needed while the app was a draft app; now `completed` works).

## 4. RevenueCat

| Item | Value |
|---|---|
| Project | "Snow Village" `projeb9d0302` (dashboard `projects/eb9d0302`), category Social Networking |
| App Store app | `appa64e95d869` "Snow Village (iOS)". In-App Purchase key and ASC API key = account team key `DGS7ANBS8T`, both **Valid credentials** |
| Play app | `app158a473529` "Snow Village (Android)". Service account JSON = the **company ldm service account** (`fastlane-play-store-deploy@project-da4ee1b7-…`, account-level Play admin, Pub/Sub admin on the RTDN project) — the same credential the other RevenueCat apps use. Valid credentials. (The quick-cable key worked for validation after the Play grant, but RevenueCat only lists Pub/Sub topics from the key's own GCP project, so RTDN needs the ldm key) |
| Products | iOS `prodfa2b1e56ee`, Play `prod6b9a86684b` (both consumable `snowvillage_big_village`) |
| Entitlement | none (consumable credit counted by the server wallet) |
| Offering | `default` `ofrnga4d4c51bc6` (current), package `pkgecc8b0777c5` lookup_key = product id, both products attached |
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

Test data to remove after the refund check: villages "QA IAP test" (capacity 6) and "QA IAP test 2" (capacity 8) and their purchase/upgrade rows.

## 7. Remaining

| To do | Who | Note |
|---|---|---|
| Refund round trip with RTDN on: the first refund (`GPA.3371-0939-…`) was issued **before** RTDN was connected, so its notification was lost (`refunded_at` still null). Buy once more, refund, confirm `refunded_at`; then delete test data | Claude | needs a free phone with the tester account (M205N / G525N; the Note9 has no Google account) |
| iPhone sandbox purchase via TestFlight | Claude | Android round trip done (§6) |
| ASC review screenshot for the IAP, store listings, Play app content forms, data safety | Claude | before submitting for review |
| Lower the RevenueCat v2 key to read-only | Claude | after setup |
