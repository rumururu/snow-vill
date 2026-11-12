---
slug: snow-village-store-assets
status: superseded
updated: 2026-11-12
---

# Snow Village — store images (layout v5, ko/en) — superseded

> 2026-11-12: replaced by the 10-language designed set in `MARKETING.md` (`marketing/<locale>/`), uploaded to both
> stores as drafts. This page records the earlier ko/en set only.

Made 2026-11-11 from real app captures (no mock screens). Upload is a separate approved release step.

## How they were made

- Showcase villages on the live server (deleted after capture): ko "눈꽃 마을", en "Snowflake Village" — 18 houses (aurora),
  3 empty lots in a half-open district, 3 photos (ChatGPT-made sample photos: hot cocoa, etc.).
- Phone: Android emulator (frun lease) at `wm size 1320x2868`, density 480, debug build with the layout v5 code.
- Tablet: iPad Pro 13-inch (M5) simulator (2064×2752), taps through the shared ios-uitest-driver (simulator build).
- `tools/compose.py`: night-sky background, caption (Apple SD Gothic Neo), the capture with the status bar cut, rounded
  and framed. The grow sheet is cut above the price line and the purchase button (debug builds show "결제 준비 중이에요").
- `captures/` (raw PNGs, 74 MB) is kept locally and not committed (`.gitignore`).

## Slots

| # | ko | en | phone | play_phone | tablet |
|---|---|---|---|---|---|
| 1 | 친구와 함께 짓는 겨울 마을 | Build a winter village with friends | ✓ | ✓ | ✓ (sky panned in) |
| 2 | 성당 광장을 가운데 두고 동네가 이어져요 | A cathedral plaza with lanes around it | ✓ | ✓ | – |
| 3 | 집을 누르면 친구의 사진 액자가 | Tap a house to see a friend's photo | ✓ | ✓ | ✓ |
| 4 | 9가지 집, 문 방향까지 내 마음대로 | 9 house types, any door direction | ✓ | ✓ | ✓ |
| 5 | 친구가 많아지면 동네를 열어 넓혀요 | Grow the village lane by lane | ✓ | ✓ | ✓ |
| 6 | 회원가입 없이 바로 시작해요 | No sign-up, start right away | ✓ | ✓ | ✓ |

Sizes: App Store phone 1320×2868 (6.9"), Google Play phone 1080×1920, iPad 2064×2752 (13"), feature graphic
1024×500, icons 1024 / 512. Visual check: every file opened; no clipped or overlapping text, no TEST/debug marks,
no personal data (sample names and photos only).

## Files

| File | Size | sha256 (12) |
|---|---|---|
| `en-US/common/app_icon_1024.png` | 1024×1024 | 8a81652c7a32 |
| `en-US/common/app_icon_512.png` | 512×512 | 1522e91e4cbe |
| `en-US/common/feature_graphic_1024x500.png` | 1024×500 | edf2a937a185 |
| `en-US/phone/01_01_village.png` | 1320×2868 | a855440f45b9 |
| `en-US/phone/02_01b_zoom.png` | 1320×2868 | e7a7dd15cdc6 |
| `en-US/phone/03_02_photo.png` | 1320×2868 | 3e110a86a0ae |
| `en-US/phone/04_03_claim.png` | 1320×2868 | ae2db1473653 |
| `en-US/phone/05_04_grow.png` | 1320×2868 | d284e7fa0a79 |
| `en-US/phone/06_05_home.png` | 1320×2868 | 024f57d75bb5 |
| `en-US/play_phone/01_01_village.png` | 1080×1920 | 2b4bd2effe63 |
| `en-US/play_phone/02_01b_zoom.png` | 1080×1920 | 467c23e7fc7f |
| `en-US/play_phone/03_02_photo.png` | 1080×1920 | 72601faf4581 |
| `en-US/play_phone/04_03_claim.png` | 1080×1920 | 520c2e35f398 |
| `en-US/play_phone/05_04_grow.png` | 1080×1920 | 6cabb33cc66c |
| `en-US/play_phone/06_05_home.png` | 1080×1920 | c15df20d60d1 |
| `en-US/tablet/01_01_village.png` | 2064×2752 | 5c2265796a4c |
| `en-US/tablet/02_02_photo.png` | 2064×2752 | b1392669fce4 |
| `en-US/tablet/03_03_claim.png` | 2064×2752 | 82387a4cf77e |
| `en-US/tablet/04_04_grow.png` | 2064×2752 | 4f2a8b65ee17 |
| `en-US/tablet/05_05_home.png` | 2064×2752 | b7586bc42bdc |
| `ko-KR/common/app_icon_1024.png` | 1024×1024 | 8a81652c7a32 |
| `ko-KR/common/app_icon_512.png` | 512×512 | 1522e91e4cbe |
| `ko-KR/common/feature_graphic_1024x500.png` | 1024×500 | dfb958751f72 |
| `ko-KR/phone/01_01_village.png` | 1320×2868 | 6a38e8c16050 |
| `ko-KR/phone/02_01b_zoom.png` | 1320×2868 | a0acf9745e2c |
| `ko-KR/phone/03_02_photo.png` | 1320×2868 | dfd471a0e5ff |
| `ko-KR/phone/04_03_claim.png` | 1320×2868 | efe2633028d6 |
| `ko-KR/phone/05_04_grow.png` | 1320×2868 | 7a63eaef3e02 |
| `ko-KR/phone/06_05_home.png` | 1320×2868 | 5e49e75a9ab9 |
| `ko-KR/play_phone/01_01_village.png` | 1080×1920 | fb246f9709e3 |
| `ko-KR/play_phone/02_01b_zoom.png` | 1080×1920 | 848110be86d1 |
| `ko-KR/play_phone/03_02_photo.png` | 1080×1920 | 6a29ff49e880 |
| `ko-KR/play_phone/04_03_claim.png` | 1080×1920 | 6eeaf31fa4ce |
| `ko-KR/play_phone/05_04_grow.png` | 1080×1920 | d0d5e8bdb1b2 |
| `ko-KR/play_phone/06_05_home.png` | 1080×1920 | eb2276559f1e |
| `ko-KR/tablet/01_01_village.png` | 2064×2752 | 8462b0cec1f4 |
| `ko-KR/tablet/02_02_photo.png` | 2064×2752 | 10f2efad0c6b |
| `ko-KR/tablet/03_03_claim.png` | 2064×2752 | 5a94d9fcd770 |
| `ko-KR/tablet/04_04_grow.png` | 2064×2752 | 19880b8742e9 |
| `ko-KR/tablet/05_05_home.png` | 2064×2752 | 47dd7194cbf7 |
