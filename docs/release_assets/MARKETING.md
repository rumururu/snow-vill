---
slug: snow-village-store-marketing
status: active
updated: 2026-11-12
---

# Snow Village — store images in 10 languages (designed composites)

Owner request 2026-11-12: store images in the style of Claire's Ranch (`claires-ranch/docs/release_assets/marketing/README.md`),
then 10 languages for a worldwide launch. Same languages and display fonts as Claire's Ranch.

## Pipeline

1. **Captures — real app screens, showcase village in memory.** `mobile/integration_test/store_shots_test.dart` drives the
   app (home, village, plaza close-up, photo frame, claim sheet, expansion sheet) in every language with a showcase village
   served by a fake `RemoteApi` (`integration_test/showcase.dart`: localized village name, 18 sample nicknames, three sample
   photos made with ChatGPT, no people/text/logos). Nothing is written to the server.
   ```bash
   cd mobile
   frun acquire --os android --form phone --emulator prefer --json      # then: adb -s <id> shell wm size 1320x2868; wm density 480
   (while true; do frun heartbeat; sleep 45; done) &                    # flutter drive is not frun's app: keep the lease alive
   SHOT_OUT=/tmp/shots/phone flutter drive --driver=test_driver/integration_test.dart \
     --target=integration_test/store_shots_test.dart -d <id> [--dart-define=SHOT_LANGS=ko,en]
   # tablet: frun acquire --os ios --form tablet --emulator prefer (iPad Pro 13" simulator, 2064×2752), same command
   ```
   Shots are the Flutter surface only (no status bar). The expansion sheet carries `04_grow.json {"crop_bottom": px}`
   (bottom of the district cards) so the composite stops above the price list and the purchase button.
2. **Composites.** `docs/release_assets/tools/build_marketing.py` lays each slide out in HTML/CSS and renders it with
   installed Chrome headless (Claire's Ranch method):
   ```bash
   python3 docs/release_assets/tools/build_marketing.py --import-shots phone /tmp/shots/phone --import-shots …   # one kind per run
   python3 docs/release_assets/tools/build_marketing.py                  # 10 locales × phone/play_phone/tablet + feature graphic
   SNOW_FONT_CACHE=<dir with the original fonts> python3 docs/release_assets/tools/build_marketing.py --fonts   # after caption edits
   ```
   Output `docs/release_assets/marketing/<locale>/{phone,play_phone,tablet,common}/`, contact sheets in `marketing/review/`.
   `--preview en-US` borrows English captures for a locale without its own (layout check only, never for the store).

## Design

- Slides: 1 cover (blurred `assets/source/background_aurora.webp`, app icon, name, tagline), 2 cathedral plaza close-up
  (phone only), 3 photo frame, 4 nine house types on a snowy stage (game art, language-free) + the claim sheet,
  5 expansion sheet, 6 home / no sign-up. Tablet has 5 (no close-up); numbers follow the device's own order.
- Backgrounds per slide: lavender, cocoa, dusk, aurora night, rose — the app's dusk palette; snow dots, snowy hills with fir
  sprites, a double gold rule. Captures sit in a cocoa wooden frame with a snow cap, tilted ±1.4°, bleeding off the bottom.
- Captions: `marketing/copy/<locale>.json` (title in two lines + subtitle; tagline = store subtitle). Titles shrink to fit;
  subtitles balance their lines.
- Fonts (SIL OFL 1.1, licences in `docs/release_assets/fonts/`): ko Jua, ja M PLUS Rounded 1c Bold, zh Resource Han
  Rounded CN Bold — subset to the caption characters (`SVDisplay-<ko|ja|zh>.ttf`); Latin/Cyrillic Nunito ExtraBold.
  Body text: Apple SD Gothic Neo / Hiragino Sans / PingFang SC / Avenir Next / Helvetica Neue (ru). Glyph coverage is
  checked before rendering.

## Sizes

App Store phone 1320×2868 (6.9"), Google Play phone 1080×1920, iPad 2064×2752 (13", also Play tablet), feature graphic
1024×500, icon 1024/512. All RGB PNG.
