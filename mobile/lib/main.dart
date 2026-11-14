import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:marionette_flutter/marionette_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/auth_service.dart';
import 'data/remote_api.dart';
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
  final auth = await _initAuth();
  runApp(
    ProviderScope(
      overrides: [
        prefsProvider.overrideWithValue(prefs),
        if (auth != null) authServiceProvider.overrideWithValue(auth),
      ],
      child: const SnowVillageApp(),
    ),
  );
}

/// Supabase Auth only (sessions, PKCE deep link); data calls stay on [RemoteApi].
Future<AuthService?> _initAuth() async {
  final config = RemoteConfig.fromEnvironment();
  if (config == null) return null;
  try {
    await Supabase.initialize(
      url: config.url,
      publishableKey: config.anonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  } catch (_) {
    return null;
  }
  final auth = Supabase.instance.client.auth;
  // Debug builds only: start signed in with a test account's refresh token (no real Google/Apple).
  const debugRefresh = String.fromEnvironment('SV_DEBUG_REFRESH_TOKEN');
  if (kDebugMode && debugRefresh.isNotEmpty && auth.currentSession == null) {
    try {
      await auth.setSession(debugRefresh);
    } catch (_) {}
  }
  return AuthService(auth);
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
