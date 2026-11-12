import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:marionette_flutter/marionette_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'l10n/app_localizations.dart';
import 'screens/create_screen.dart';
import 'screens/home_screen.dart';
import 'screens/village_screen.dart';
import 'state/providers.dart';
import 'ui/common.dart';

Future<void> main() async {
  if (kDebugMode) {
    MarionetteBinding.ensureInitialized(
      const MarionetteConfiguration(maxScreenshotSize: Size(1200, 1200)),
    );
  } else {
    WidgetsFlutterBinding.ensureInitialized();
  }
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [prefsProvider.overrideWithValue(prefs)],
      child: const SnowVillageApp(),
    ),
  );
}

final _router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
    GoRoute(path: '/create', builder: (_, _) => const CreateScreen()),
    GoRoute(
      path: '/v/:id',
      builder: (_, s) => VillageScreen(
        villageId: s.pathParameters['id']!,
        isNew: s.uri.queryParameters['new'] == '1',
      ),
    ),
  ],
);

class SnowVillageApp extends StatelessWidget {
  const SnowVillageApp({super.key, this.locale});

  /// Forces a language (store screenshots); null follows the device.
  final Locale? locale;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      locale: locale,
      onGenerateTitle: (c) => AppLocalizations.of(c).appTitle,
      theme: buildTheme(),
      routerConfig: _router,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
