import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../l10n/app_localizations.dart';
import '../state/providers.dart';
import '../ui/common.dart';

/// Sign-in sheet (Google, Apple). Resolves true once signed in — also when the session arrives
/// later through the Android Apple redirect while the sheet is open — and after the device's
/// guest villages and houses were linked to the account.
Future<bool> showSignInSheet(BuildContext context, WidgetRef ref) async {
  if (ref.read(sessionProvider) != null) return true;
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const AccountSheet(),
  );
  if (ok != true) return false;
  await ref.read(sessionProvider.notifier).linked;
  return true;
}

/// Home entry: sign in when signed out; sign out / delete the account when signed in.
Future<void> showAccountSheet(BuildContext context) => showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => const AccountSheet(),
);

class AccountSheet extends ConsumerStatefulWidget {
  const AccountSheet({super.key});

  @override
  ConsumerState<AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends ConsumerState<AccountSheet> {
  bool _busy = false;
  String? _error;

  Future<void> _signIn({required bool apple}) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final r = await signIn(ref, apple: apple);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (!r.ok) _error = trKey(AppLocalizations.of(context), r.error!);
    });
    // Signed in: the session listener below closes the sheet.
  }

  Future<void> _signOut() async {
    setState(() => _busy = true);
    await signOut(ref);
    if (mounted) Navigator.pop(context);
  }

  Future<void> _delete() async {
    final l = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(l.deleteAccountTitle),
        content: Text(l.deleteAccountBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text(l.cancel),
          ),
          TextButton(
            key: const ValueKey('confirm-delete-account'),
            style: TextButton.styleFrom(foregroundColor: SvColors.danger),
            onPressed: () => Navigator.pop(c, true),
            child: Text(l.deleteAccountButton),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final r = await deleteAccount(ref);
    if (!mounted) return;
    if (!r.ok) {
      setState(() {
        _busy = false;
        _error = trKey(l, r.error!);
      });
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(l.accountDeleted),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final session = ref.watch(sessionProvider);
    ref.listen(sessionProvider, (prev, next) {
      if (prev == null && next != null && mounted) Navigator.pop(context, true);
    });

    final title = Text(
      session == null ? l.signIn : (session.user.email ?? ''),
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: SvColors.night,
      ),
    );

    final children = session == null
        ? <Widget>[
            title,
            const SizedBox(height: 16),
            OutlinedButton(
              key: const ValueKey('sign-in-google'),
              onPressed: _busy ? null : () => _signIn(apple: false),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'G',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF4285F4),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(l.continueWithGoogle),
                ],
              ),
            ),
            const SizedBox(height: 10),
            IgnorePointer(
              ignoring: _busy,
              child: SignInWithAppleButton(
                key: const ValueKey('sign-in-apple'),
                text: l.continueWithApple,
                height: 52,
                borderRadius: const BorderRadius.all(Radius.circular(16)),
                onPressed: () => _signIn(apple: true),
              ),
            ),
          ]
        : <Widget>[
            title,
            const SizedBox(height: 16),
            OutlinedButton(
              key: const ValueKey('sign-out'),
              onPressed: _busy ? null : _signOut,
              child: Text(l.signOut),
            ),
            const SizedBox(height: 8),
            TextButton(
              key: const ValueKey('delete-account'),
              style: TextButton.styleFrom(
                foregroundColor: SvColors.danger,
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: _busy ? null : _delete,
              child: Text(l.deleteAccount),
            ),
          ];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...children,
          if (_busy) ...[
            const SizedBox(height: 12),
            const Center(child: CircularProgressIndicator()),
          ],
          if (_error case final e?) ...[
            const SizedBox(height: 12),
            ErrorBox(e),
          ],
        ],
      ),
    );
  }
}

/// Whether sign-in is available in this build (server configured).
bool signInAvailable(WidgetRef ref) => ref.watch(authServiceProvider) != null;
