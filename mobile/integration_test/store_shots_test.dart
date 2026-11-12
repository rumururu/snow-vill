// Store screenshots in every store language, from the real app screens with a showcase village held in memory
// (nothing is written to the server). Run through the driver so the PNGs land on the host:
//
//   flutter drive --driver=test_driver/integration_test.dart --target=integration_test/store_shots_test.dart \
//     -d <leased device> [--dart-define=SHOT_LANGS=ko,en]
//
// Phone: Android emulator at `wm size 1320x2868` + density 480 → shots are 1320×2868.
// Tablet: iPad Pro 13" simulator → 2064×2752. Output: $SHOT_OUT (default build/store_shots)/<locale>/<name>.png.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:snow_village/data/models.dart';
import 'package:snow_village/data/remote_api.dart';
import 'package:snow_village/main.dart';
import 'package:snow_village/scene/geometry.dart';
import 'package:snow_village/screens/home_screen.dart';
import 'package:snow_village/state/providers.dart';

import 'showcase.dart';
import 'showcase_photos.dart';

/// Serves the showcase village; photos come from a loopback HTTP server on the device.
class _ShowcaseApi extends RemoteApi {
  _ShowcaseApi(this.village, this.photoBase)
    : super(const RemoteConfig(url: 'http://127.0.0.1:9', anonKey: 'showcase'));
  final Village village;
  final String photoBase;

  @override
  Future<Village?> getVillage(String villageId) async => village;

  @override
  Future<Map<int, int>> wallet(String installId) async => const {};

  @override
  Future<String> photoUrl(
    String installId,
    String villageId,
    String houseId,
  ) async =>
      '$photoBase/${photoSlots.indexOf(int.parse(houseId.substring(1)))}.jpg';
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const only = String.fromEnvironment('SHOT_LANGS');
  final langs = only.isEmpty ? showcaseLangs : only.split(',');

  testWidgets('store screenshots', (tester) async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((req) {
      final i = int.tryParse(req.uri.pathSegments.last.split('.').first) ?? 0;
      req.response.headers.contentType = ContentType('image', 'jpeg');
      req.response.add(base64Decode(showcasePhotos[i.clamp(0, 2)]));
      req.response.close();
    });
    final photoBase = 'http://127.0.0.1:${server.port}';
    final geometry = await VillageGeometry.load();
    if (Platform.isAndroid) await binding.convertFlutterSurfaceToImage();
    final dpr = tester.view.devicePixelRatio;

    Future<void> settle([int ms = 1500]) async {
      for (var t = 0; t < ms; t += 100) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    Future<void> shot(
      String lang,
      String name, [
      Map<String, Object?>? args,
    ]) async {
      debugPrint('store-shot $lang $name');
      await settle(600);
      await binding.takeScreenshot('${storeLocale[lang]}/$name', args);
    }

    for (final lang in langs) {
      final json = showcaseVillageJson(lang);
      // Doors face the district centre, as when a friend accepts the default direction.
      for (final h in json['houses'] as List) {
        final m = h as Map<String, Object?>;
        m['direction'] = geometry.lots[m['slot'] as int].facing;
      }
      final village = Village.fromJson(json);
      SharedPreferences.setMockInitialValues({
        'snowvill.identity.v1': jsonEncode({
          'installId': '00000000-0000-4000-8000-000000000000',
          'owners': {showcaseVillageId: 'showcase-owner'},
          'houses': <String, Object?>{},
          'villages': [
            {
              'id': showcaseVillageId,
              'name': village.name,
              'lastOpened': DateTime.utc(2026, 12, 1).toIso8601String(),
            },
          ],
        }),
      });
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(
        ProviderScope(
          key: ValueKey('scope-$lang'),
          overrides: [
            prefsProvider.overrideWithValue(prefs),
            remoteApiProvider.overrideWithValue(
              _ShowcaseApi(village, photoBase),
            ),
          ],
          child: SnowVillageApp(
            key: ValueKey('app-$lang'),
            locale: Locale(lang),
          ),
        ),
      );
      GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/');
      await settle(2500);
      expect(find.byType(HomeScreen), findsOneWidget);
      await shot(lang, '05_home');

      GoRouter.of(
        tester.element(find.byType(HomeScreen)),
      ).go('/v/$showcaseVillageId');
      await settle(4000);
      // The free village as it starts: a small diorama in the middle of the screen (no zoom).
      await shot(lang, '01_village');

      debugPrint('store-step photo');
      // A friend's photo frame (hot cocoa).
      await tester.tap(
        find.byKey(const ValueKey('slot-1')),
        warnIfMissed: false,
      );
      await settle(3000);
      expect(find.byKey(const ValueKey('frame-photo')), findsOneWidget);
      await shot(lang, '02_photo');
      await Navigator.of(
        tester.element(find.byKey(const ValueKey('frame-photo'))),
      ).maybePop();
      await settle(1200);

      debugPrint('store-step claim');
      // Claim an empty lot: nickname typed, gingerbread picked.
      await tester.tap(
        find.byKey(const ValueKey('slot-5')),
        warnIfMissed: false,
      );
      await settle(1500);
      await tester.enterText(
        find.byKey(const ValueKey('nickname')),
        claimName[lang]!,
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await settle(1200);
      final ginger = find.byKey(const ValueKey('style-gingerbread'));
      await tester.ensureVisible(ginger);
      await tester.tap(ginger);
      // Back to the top of the sheet: title, nickname and the type grid.
      tester
          .state<ScrollableState>(
            find
                .ancestor(
                  of: find.byKey(const ValueKey('nickname')),
                  matching: find.byType(Scrollable),
                )
                .first,
          )
          .position
          .jumpTo(0);
      await settle(1500);
      await shot(lang, '03_claim');
      await Navigator.of(
        tester.element(find.byKey(const ValueKey('nickname'))),
      ).maybePop();
      await settle(1200);

      debugPrint('store-step grow');
      // Grow: open it from the village menu (works on any screen shape), pick the district behind; the sheet is
      // cropped above the price/button rows by compose.
      await tester.tap(find.byKey(const ValueKey('village-menu')));
      await settle(1200);
      await tester.tap(find.byKey(const ValueKey('menu-grow')));
      await settle(2000);
      final pick = find.byKey(const ValueKey('district-pick-1'));
      expect(pick, findsOneWidget);
      await tester.tap(pick);
      await settle(800);
      final bottom = _cardsBottom(tester);
      // Android cannot pass screenshot args: the crop hint rides in the name (driver splits it off).
      await shot(lang, '04_grow__crop${((bottom + 16) * dpr).round()}');
      await Navigator.of(tester.element(pick)).maybePop();
      await settle(1000);
    }
    await server.close(force: true);
  });
}

/// Bottom edge of the lowest district card in the upgrade sheet (where the crop stops).
double _cardsBottom(WidgetTester tester) {
  final cards = find.byWidgetPredicate(
    (w) =>
        w.key is ValueKey<String> &&
        (w.key! as ValueKey<String>).value.startsWith('district-pick-'),
  );
  var bottom = 0.0;
  for (var i = 0; i < cards.evaluate().length; i++) {
    final b = tester.getBottomLeft(cards.at(i)).dy;
    if (b > bottom) bottom = b;
  }
  return bottom;
}
