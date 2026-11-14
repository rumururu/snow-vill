import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

abstract final class SvColors {
  static const ivory = Color(0xFFF6F0E4);
  static const sage = Color(0xFF708B82);
  static const night = Color(0xFF404F70);
  static const wood = Color(0xFFC88A56);
  static const glow = Color(0xFFE7B66B);
  static const sky = Color(0xFFEAF1F5);
  static const danger = Color(0xFFB5523B);
  static const dangerBg = Color(0xFFF8E6DD);
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SvColors.night,
      primary: SvColors.night,
      surface: SvColors.ivory,
    ),
    scaffoldBackgroundColor: SvColors.sky,
  );
  return base.copyWith(
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        backgroundColor: SvColors.night,
        foregroundColor: SvColors.ivory,
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        foregroundColor: SvColors.night,
        backgroundColor: Colors.white,
        side: BorderSide(color: SvColors.night.withValues(alpha: 0.15)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: SvColors.ivory,
      showDragHandle: true,
    ),
  );
}

/// Localised text for a dynamic error key coming from validation / providers.
String trKey(AppLocalizations l, String key) => switch (key) {
  'nameRequired' => l.nameRequired,
  'nameTooLong' => l.nameTooLong,
  'nicknameRequired' => l.nicknameRequired,
  'nicknameTooLong' => l.nicknameTooLong,
  'messageTooLong' => l.messageTooLong,
  'errRateLimited' => l.errRateLimited,
  'errNetwork' => l.errNetwork,
  'errForbidden' => l.errForbidden,
  'errPhotoTooLarge' => l.errPhotoTooLarge,
  'errPhotoUnsupported' => l.errPhotoUnsupported,
  'errNotFound' => l.errNotFound,
  'errSlotTaken' => l.errSlotTaken,
  'errVillageFull' => l.errVillageFull,
  'errAlreadyJoined' => l.errAlreadyJoined,
  'errNoServer' => l.errNoServer,
  'linkInvalid' => l.linkInvalid,
  'errNoCredit' => l.errNoCredit,
  'errAlreadyBig' => l.errAlreadyBig,
  'errPurchaseFailed' => l.errPurchaseFailed,
  'errPurchasePending' => l.errPurchasePending,
  'errSignIn' => l.errSignIn,
  _ => l.errServer,
};

void showToast(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
}

class ErrorBox extends StatelessWidget {
  const ErrorBox(this.text, {super.key, this.action});
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: SvColors.dangerBg,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          liveRegion: true,
          child: Text(text, style: const TextStyle(color: SvColors.night)),
        ),
        if (action != null) ...[const SizedBox(height: 8), action!],
      ],
    ),
  );
}

/// Web base URL for invite links and the privacy policy.
const String webBase = String.fromEnvironment(
  'WEB_BASE',
  defaultValue: 'https://snow.mkideabox.com',
);

String inviteUrl(String villageId) =>
    '$webBase/v/?id=$villageId&src=invite_app';

/// Accepts a full invite URL or a bare 10-character village id.
String? parseVillageId(String input) {
  final t = input.trim();
  final bare = RegExp(r'^[a-km-z2-9]{10}$');
  if (bare.hasMatch(t)) return t;
  final uri = Uri.tryParse(t);
  final id = uri?.queryParameters['id'];
  return id != null && bare.hasMatch(id) ? id : null;
}
