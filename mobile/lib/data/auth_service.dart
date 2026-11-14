/// Optional sign-in (docs/12-accounts-and-private-villages.md). Company standard: native SDK →
/// id token → `signInWithIdToken`. Android Apple has no native SDK, so it goes through the Supabase
/// OAuth (PKCE) redirect back to [loginCallback]; supabase_flutter finishes it from the deep link.
library;

import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum SignInResult {
  signedIn,
  cancelled,

  /// The browser was opened (Android Apple); the session arrives with the deep link.
  redirected,
}

class AuthService {
  AuthService(this._auth);
  final GoTrueClient _auth;

  static const googleWebClientId =
      '326320694955-6ltlbk16iv6knc29agfmjevp6bopa8oi.apps.googleusercontent.com';
  static const googleIosClientId =
      '326320694955-0ovsn0vsf9mqlf65v3nk8ta5ijt7epng.apps.googleusercontent.com';
  static const loginCallback = 'com.mkideabox.snowvillage://login-callback';

  Future<void>? _googleReady;

  /// GoogleSignIn.initialize runs once per process, so one nonce serves this run's Google sign-ins.
  late final String _googleNonce = _randomNonce();

  Session? get session => _auth.currentSession;
  Stream<AuthState> get changes => _auth.onAuthStateChange;

  /// 'google' | 'apple' | null.
  String? get provider => _auth.currentUser?.appMetadata['provider'] as String?;

  /// The access token for API calls, refreshed when it has expired; null for a guest.
  Future<String?> accessToken() async {
    var s = _auth.currentSession;
    if (s == null) return null;
    if (s.isExpired) {
      try {
        s = (await _auth.refreshSession()).session;
      } catch (_) {
        // Offline or revoked: the server answers as for a guest / 401.
      }
    }
    return s?.accessToken;
  }

  static String _randomNonce([int length = 32]) {
    const chars =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
    final r = Random.secure();
    return List.generate(length, (_) => chars[r.nextInt(chars.length)]).join();
  }

  static String _sha256(String s) => sha256.convert(utf8.encode(s)).toString();

  Future<void> _initGoogle() => GoogleSignIn.instance.initialize(
    clientId: defaultTargetPlatform == TargetPlatform.iOS
        ? googleIosClientId
        : null,
    serverClientId: googleWebClientId,
    nonce: _sha256(_googleNonce),
  );

  Future<SignInResult> signInWithGoogle() async {
    _googleReady ??= _initGoogle();
    await _googleReady;
    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate();
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled ||
          e.code == GoogleSignInExceptionCode.interrupted) {
        return SignInResult.cancelled;
      }
      rethrow;
    }
    final idToken = account.authentication.idToken;
    if (idToken == null) throw const AuthException('no Google id token');
    await _auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      nonce: _googleNonce,
    );
    return SignInResult.signedIn;
  }

  Future<SignInResult> signInWithApple() async {
    if (defaultTargetPlatform != TargetPlatform.iOS) {
      final launched = await _auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: loginCallback,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return launched ? SignInResult.redirected : SignInResult.cancelled;
    }
    final raw = _randomNonce();
    final AuthorizationCredentialAppleID credential;
    try {
      credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [AppleIDAuthorizationScopes.email],
        nonce: _sha256(raw),
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        return SignInResult.cancelled;
      }
      rethrow;
    }
    final idToken = credential.identityToken;
    if (idToken == null) throw const AuthException('no Apple id token');
    await _auth.signInWithIdToken(
      provider: OAuthProvider.apple,
      idToken: idToken,
      nonce: raw,
    );
    return SignInResult.signedIn;
  }

  /// A fresh Sign in with Apple authorization code (iOS, Apple accounts) so the server can revoke
  /// the Apple grant on account deletion. Best effort: null when unavailable or cancelled.
  Future<String?> appleAuthorizationCode() async {
    if (defaultTargetPlatform != TargetPlatform.iOS || provider != 'apple') {
      return null;
    }
    try {
      final c = await SignInWithApple.getAppleIDCredential(scopes: const []);
      return c.authorizationCode;
    } catch (_) {
      return null;
    }
  }

  /// Signs this device out (the session is dropped locally even when the server call fails).
  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {}
    if (_googleReady != null) {
      try {
        await GoogleSignIn.instance.signOut();
      } catch (_) {}
    }
  }
}
