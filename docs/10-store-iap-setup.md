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
| Apple server notifications | **not set yet** — the RevenueCat URL is masked until the RevenueCat account password is entered (Reveal). Then `PATCH /v1/apps/6832823869` with `subscriptionStatusUrl`/`…ForSandbox` and version `V2` (claires-space did the same) |

Scripts (run from `mobile/`): `tools/store/asc.py` (API helper, key `DGS7ANBS8T`, `.p8` beside the iOS Fastfile, gitignored),
`tools/store/asc_iaps.py` (idempotent product creation).

## 3. Google Play

| Item | Value |
|---|---|
| App | `4974954907414864233`, package `com.mkideabox.snowvillage`, app, free, default language ko-KR |
| Internal testing | track `4700181973142712605`, release versionCode 2 (1.0.0) **rolled out 2026-11-10**, testers = list "Gold Frontier testers" (company test device account). Opt-in: `https://play.google.com/apps/internaltest/4700181973142712605` |
| One-time product | `snowvillage_big_village`, purchase option `default` (buy, **backwards compatible** — needed by RevenueCat/Billing), digital content, created and activated in the console 2026-11-10 |
| Upload key | `mobile/android/app/snowvillage-release.jks` alias `snowvillage`; password in keychain account `snowvillage-upload-key`, service `android-keystore`; `mobile/android/key.properties` (gitignored). **Back up the keystore** — losing it needs an upload key reset |
| Service account | `mobile/android/fastlane/play-store-key.json` (company `fastlane-play-store@…`, gitignored). It can upload releases but gets **403 on product/pricing APIs**, so `tools/store/play_iaps.py` currently fails; the product was made in the console instead |

Lane: `mobile/android/fastlane` `internal` (`draft:true` was needed while the app was a draft app; now `completed` works).

## 4. RevenueCat

| Item | Value |
|---|---|
| Project | "Snow Village" `projeb9d0302` (dashboard `projects/eb9d0302`), category Social Networking |
| App Store app | `appa64e95d869` "Snow Village (iOS)". In-App Purchase key and ASC API key = account team key `DGS7ANBS8T`, both **Valid credentials** |
| Play app | `app158a473529` "Snow Village (Android)". Service account JSON uploaded; catalog read checks pass, **"package name not found" on purchase access** right after the first rollout — re-check (ldm saw the same until its build propagated) |
| Products | iOS `prodfa2b1e56ee`, Play `prod6b9a86684b` (both consumable `snowvillage_big_village`) |
| Entitlement | none (consumable credit counted by the server wallet) |
| Offering | `default` `ofrnga4d4c51bc6` (current), package `pkgecc8b0777c5` lookup_key = product id, both products attached |
| Webhook | `whintgre12bd5d2fe714ce9a01feb1a79a57b25` → `https://qfhbkfzxhldfycmcwntw.supabase.co/functions/v1/snowvill-purchase-webhook`, production + sandbox, all events, Authorization = keychain `snowvill-webhook-auth` (service `supabase`) = Supabase secret `SNOWVILL_WEBHOOK_AUTH` |
| Public SDK keys | in `mobile/env/prod.json` (`REVENUECAT_IOS_KEY` `appl_…`, `REVENUECAT_ANDROID_KEY` `goog_…`; public values but the file is gitignored with the Supabase anon key) |
| v2 secret key | `claude-setup-v2`: project configuration read & write, customer information read only. Keychain account `snowvillage-revenuecat-secret`, service `revenuecat`. Lower it to read-only once setup is final (claires-space/ldm did) |
| Google developer notifications (RTDN) | not connected yet (needs the Play credentials to validate first) |

Query: `GET https://api.revenuecat.com/v2/projects/projeb9d0302/{apps|products|offerings}` (Bearer = keychain key above).

## 5. Build notes

- `purchases_flutter` is pinned to **10.15.2**: 11.x needs the `PurchasesHybridCommon` 20.x pod, which is not on CocoaPods
  trunk yet (trunk freeze). CocoaPods trunk becomes read-only on 2026-12-02; the next RevenueCat major drops CocoaPods →
  move the iOS app to Swift Package Manager before upgrading.
- iOS deployment target is 15.0 (Xcode 27 minimum). The iOS lane runs flutter/pod in a clean Ruby env (fastlane's Ruby
  breaks CocoaPods) and ignores altool's harmless `CDUploaderStateInfoResumeFilePath` notice after "UPLOAD SUCCEEDED".
- App icon / adaptive icon / launch image come from the original house art (`mobile/assets/icon/`, `flutter_launcher_icons`).

## 6. Remaining

| To do | Who | Note |
|---|---|---|
| Reveal the Apple server notification URL in RevenueCat (password) | owner | then the ASC PATCH in §2 |
| RevenueCat Play credentials "Check again" after propagation; connect RTDN | Claude | |
| Real purchase round trip: Note9 (license tester) via Play internal testing; iPhone sandbox via TestFlight. Purchase → webhook → wallet → upgrade 6→8; refund → wallet revoke | Claude | |
| ASC review screenshot for the IAP, store listings, Play app content forms, data safety | Claude | before submitting for review |
| Lower the RevenueCat v2 key to read-only | Claude | after setup |
