import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' show Offset;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show Session;

import '../data/auth_service.dart';
import '../data/identity_store.dart';
import '../data/models.dart';
import '../data/purchase_service.dart';
import '../data/remote_api.dart';
import '../data/validation.dart';
import '../scene/geometry.dart';

/// Overridden in main() with the loaded instance.
final prefsProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('prefsProvider not overridden'),
);

/// Overridden in main() once Supabase Auth is initialised; null = no server configured (sign-in hidden).
final authServiceProvider = Provider<AuthService?>((ref) => null);

final remoteApiProvider = Provider<RemoteApi?>((ref) {
  final config = RemoteConfig.fromEnvironment();
  final auth = ref.watch(authServiceProvider);
  return config == null
      ? null
      : RemoteApi(config, accessToken: auth?.accessToken);
});

/// The signed-in session (null = guest). Right after a sign-in, what this device made as a guest
/// (owner and claim secrets) is linked to the account; the secrets stay on the device.
class SessionNotifier extends Notifier<Session?> {
  @override
  Session? build() {
    final auth = ref.watch(authServiceProvider);
    if (auth == null) return null;
    final sub = auth.changes.listen((change) {
      final before = state?.user.id;
      final after = change.session?.user.id;
      // Set before the state change so anyone reacting to it can await [linked].
      if (after != null && after != before) _linking = _linkDevice();
      state = change.session;
    });
    ref.onDispose(sub.cancel);
    return auth.session;
  }

  Future<void>? _linking;

  /// Completes once the latest sign-in's device linking finished.
  Future<void> get linked => _linking ?? Future.value();

  Future<void> _linkDevice() async {
    final api = ref.read(remoteApiProvider);
    final id = ref.read(identityProvider);
    if (api != null && (id.owners.isNotEmpty || id.houses.isNotEmpty)) {
      try {
        await api.linkDevice(id.owners, {
          for (final h in id.houses.values) h.houseId: h.secret,
        });
      } catch (_) {
        // Best effort: the secrets still work on this device; the next sign-in retries.
      }
    }
    ref.invalidate(myVillagesProvider);
    ref.invalidate(villageProvider);
  }
}

final sessionProvider = NotifierProvider<SessionNotifier, Session?>(
  SessionNotifier.new,
);

/// The account's villages (owned, lived in, member of, requested); null for a guest.
final myVillagesProvider = FutureProvider<List<AccountVillage>?>((ref) async {
  final userId = ref.watch(sessionProvider.select((s) => s?.user.id));
  final api = ref.watch(remoteApiProvider);
  if (userId == null || api == null) return null;
  return api.myVillages();
});

/// Owner of a private village: join requests and members.
final membersProvider = FutureProvider.autoDispose
    .family<List<Member>?, String>((ref, villageId) async {
      final userId = ref.watch(sessionProvider.select((s) => s?.user.id));
      final api = ref.watch(remoteApiProvider);
      if (userId == null || api == null) return null;
      return api.membersOf(villageId);
    });

/// This device's owner / claim secrets for a village (lets a guest keep seeing a private village).
List<String> secretsFor(Identity id, String villageId) => [
  ?id.owners[villageId],
  ?id.houses[villageId]?.secret,
];

/// Owner by this device's secret or by the signed-in account.
bool isOwnerOf(Identity id, Village v) =>
    id.owners.containsKey(v.id) || v.myRole == 'owner';

/// This caller's house in the village (by claim secret, or the account's house).
String? myHouseIdIn(Identity id, Village v) =>
    id.houses[v.id]?.houseId ?? v.myHouseId;

final purchaseServiceProvider = Provider<PurchaseService>(
  (ref) => PurchaseService(),
);

final villageGeometryProvider = FutureProvider<VillageGeometry>(
  (ref) => VillageGeometry.load(),
);

class IdentityNotifier extends Notifier<Identity> {
  late final IdentityStore _store;

  @override
  Identity build() {
    _store = IdentityStore(ref.watch(prefsProvider));
    return _store.load();
  }

  void _set(Identity next) {
    state = next;
    _store.save(next);
  }

  void remember(Village v) {
    final rest = state.villages.where((k) => k.id != v.id).toList();
    _set(
      state.copyWith(
        villages: [
          KnownVillage(id: v.id, name: v.name, lastOpened: DateTime.now()),
          ...rest,
        ],
      ),
    );
  }

  void forget(String villageId) {
    _set(
      state.copyWith(
        villages: state.villages.where((k) => k.id != villageId).toList(),
        owners: Map.of(state.owners)..remove(villageId),
        houses: Map.of(state.houses)..remove(villageId),
      ),
    );
  }

  void setOwner(String villageId, String secret) =>
      _set(state.copyWith(owners: {...state.owners, villageId: secret}));

  void setHouse(String villageId, String houseId, String secret) => _set(
    state.copyWith(
      houses: {...state.houses, villageId: (houseId: houseId, secret: secret)},
    ),
  );

  void clearHouse(String villageId) =>
      _set(state.copyWith(houses: Map.of(state.houses)..remove(villageId)));
}

final identityProvider = NotifierProvider<IdentityNotifier, Identity>(
  IdentityNotifier.new,
);

/// Outcome of a user action, with an l10n error key when it failed.
class ActionOutcome {
  const ActionOutcome.ok([this.value]) : error = null;
  const ActionOutcome.fail(this.error) : value = null;
  final String? error;
  final Object? value;
  bool get ok => error == null;
}

String errorKey(Object e) => e is RemoteError
    ? switch (e.code) {
        RemoteErrorCode.rateLimited => 'errRateLimited',
        RemoteErrorCode.network => 'errNetwork',
        RemoteErrorCode.forbidden => 'errForbidden',
        RemoteErrorCode.tooLarge => 'errPhotoTooLarge',
        RemoteErrorCode.unsupported => 'errPhotoUnsupported',
        RemoteErrorCode.notFound => 'errNotFound',
        RemoteErrorCode.conflict => 'errAlreadyJoined',
        _ => 'errServer',
      }
    : 'errServer';

/// Creates a village on the server and remembers its owner secret.
Future<ActionOutcome> createVillage(WidgetRef ref, String rawName) async {
  final api = ref.read(remoteApiProvider);
  if (api == null) return const ActionOutcome.fail('errNoServer');
  final err = villageNameError(rawName);
  if (err != null) return ActionOutcome.fail(err);
  try {
    final r = await api.createVillage(
      ref.read(identityProvider).installId,
      sanitizeText(rawName),
    );
    ref.read(identityProvider.notifier).setOwner(r.id, r.ownerSecret);
    return ActionOutcome.ok(r.id);
  } catch (e) {
    return ActionOutcome.fail(errorKey(e));
  }
}

class VillageNotifier extends AsyncNotifier<Village?> {
  VillageNotifier(this.villageId);
  final String villageId;
  Timer? _poll;

  RemoteApi get _api => ref.read(remoteApiProvider)!;
  Identity get _identity => ref.read(identityProvider);
  bool get _signedIn => ref.read(sessionProvider) != null;
  Future<Village?> _fetch() =>
      _api.getVillage(villageId, secrets: secretsFor(_identity, villageId));

  @override
  Future<Village?> build() async {
    // Sign-in / sign-out changes what this caller may see.
    ref.watch(sessionProvider.select((s) => s?.user.id));
    _poll?.cancel();
    // Friends' new houses show up without pulling to refresh.
    _poll = Timer.periodic(
      const Duration(seconds: 20),
      (_) => refresh(silent: true),
    );
    ref.onDispose(() => _poll?.cancel());
    final v = await _fetch();
    if (v != null) ref.read(identityProvider.notifier).remember(v);
    return v;
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent && !state.hasValue) state = const AsyncLoading<Village?>();
    final next = await AsyncValue.guard(_fetch);
    // Keep showing the last good village if a background refresh fails.
    if (next.hasError && state.hasValue && silent) return;
    state = next;
    // New join requests show up on the owner's badge.
    if (next.value?.isPrivate == true) {
      ref.invalidate(membersProvider(villageId));
    }
  }

  Future<ActionOutcome> claim(
    int slot, {
    required String nickname,
    required HouseStyle style,
    required int direction,
    required String message,
    Uint8List? photo,
  }) async {
    final e = nicknameError(nickname) ?? messageError(message);
    if (e != null) return ActionOutcome.fail(e);
    ClaimResult r;
    try {
      r = await _api.claimHouse(
        _identity.installId,
        villageId,
        slot,
        nickname: sanitizeText(nickname),
        style: style,
        direction: direction,
        message: sanitizeText(message, multiline: true),
      );
    } catch (err) {
      return ActionOutcome.fail(errorKey(err));
    }
    if (!r.ok) {
      await refresh(silent: true);
      return ActionOutcome.fail(switch (r.failure!) {
        ClaimFailure.slotTaken => 'errSlotTaken',
        ClaimFailure.villageFull => 'errVillageFull',
        ClaimFailure.alreadyJoined => 'errAlreadyJoined',
        ClaimFailure.notFound => 'errNotFound',
        ClaimFailure.privateVillage => 'errForbidden',
      });
    }
    ref
        .read(identityProvider.notifier)
        .setHouse(villageId, r.house!.id, r.claimSecret!);
    String? photoError;
    if (photo != null) {
      try {
        await _api.uploadPhoto(
          _identity.installId,
          r.house!.id,
          r.claimSecret!,
          photo,
        );
      } catch (err) {
        photoError = errorKey(err);
      }
    }
    await refresh(silent: true);
    return ActionOutcome.ok((house: r.house!, photoError: photoError));
  }

  Future<ActionOutcome> uploadPhoto(String houseId, Uint8List jpeg) async {
    final mine = _identity.houses[villageId];
    final byAccount = _signedIn && state.value?.myHouseId == houseId;
    if (mine?.houseId != houseId && !byAccount) {
      return const ActionOutcome.fail('errForbidden');
    }
    try {
      await _api.uploadPhoto(
        _identity.installId,
        houseId,
        mine?.houseId == houseId ? mine!.secret : null,
        jpeg,
      );
      await refresh(silent: true);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  Future<String> photoUrl(String houseId) => _api.photoUrl(
    _identity.installId,
    villageId,
    houseId,
    secrets: secretsFor(_identity, villageId),
  );

  /// Signed-in owner (no secret needed on the server).
  bool get _accountOwner => _signedIn && state.value?.myRole == 'owner';

  Future<ActionOutcome> removeHouse(String houseId) async {
    final mine = _identity.houses[villageId];
    final secret = mine?.houseId == houseId
        ? mine!.secret
        : _identity.owners[villageId];
    final byAccount =
        _signedIn &&
        (state.value?.myHouseId == houseId || state.value?.myRole == 'owner');
    if (secret == null && !byAccount) {
      return const ActionOutcome.fail('errForbidden');
    }
    try {
      await _api.removeHouse(_identity.installId, houseId, secret);
      if (mine?.houseId == houseId) {
        ref.read(identityProvider.notifier).clearHouse(villageId);
      }
      await refresh(silent: true);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  Future<ActionOutcome> report(String houseId) async {
    try {
      await _api.report(_identity.installId, houseId, 'inappropriate');
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  /// Unspent expansion credits per price tier.
  Future<Map<int, int>> walletCredits() => _api.wallet(_identity.installId);

  /// Spends one credit of the tier this village needs to open the next half of [district].
  /// Returns ok, or an l10n error key.
  Future<ActionOutcome> applyUpgrade(int district) async {
    try {
      final reason = await _api.upgradeVillage(
        _identity.installId,
        villageId,
        district,
      );
      await refresh(silent: true);
      return switch (reason) {
        null => const ActionOutcome.ok(),
        'NO_CREDIT' => const ActionOutcome.fail('errNoCredit'),
        'DISTRICT_OPEN' ||
        'MAX_SIZE' => const ActionOutcome.fail('errAlreadyBig'),
        _ => const ActionOutcome.fail('errNotFound'),
      };
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  /// After a store purchase the webhook credits the wallet asynchronously: wait for a credit of
  /// [tier] (≤ ~45s), then open the next half of [district].
  Future<ActionOutcome> applyUpgradeAfterPurchase(
    int tier,
    int district,
  ) async {
    for (var i = 0; i < 30; i++) {
      try {
        if (((await walletCredits())[tier] ?? 0) > 0) {
          return applyUpgrade(district);
        }
      } catch (_) {}
      await Future<void>.delayed(const Duration(milliseconds: 1500));
    }
    return const ActionOutcome.fail('errPurchasePending');
  }

  /// Owner only: one path style for the whole village and the moved decorations.
  Future<ActionOutcome> setLook(
    PathStyle pathStyle,
    Map<String, Offset> decor,
  ) async {
    final secret = _identity.owners[villageId];
    if (secret == null && !_accountOwner) {
      return const ActionOutcome.fail('errForbidden');
    }
    try {
      final reason = await _api.setVillageLook(
        _identity.installId,
        villageId,
        secret,
        pathStyle,
        decor,
      );
      if (reason != null) {
        return ActionOutcome.fail(
          reason == 'FORBIDDEN' ? 'errForbidden' : 'errNotFound',
        );
      }
      final v = state.value;
      if (v != null) {
        state = AsyncData(v.copyWith(pathStyle: pathStyle, decor: decor));
      }
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  Future<ActionOutcome> deleteVillage() async {
    final secret = _identity.owners[villageId];
    if (secret == null && !_accountOwner) {
      return const ActionOutcome.fail('errForbidden');
    }
    try {
      await _api.deleteVillage(_identity.installId, villageId, secret);
      ref.read(identityProvider.notifier).forget(villageId);
      ref.invalidate(myVillagesProvider);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  /// Signed-in owner: private (only residents and approved members) or public.
  Future<ActionOutcome> setPrivate(bool private) async {
    try {
      final reason = await _api.setVisibility(villageId, private: private);
      if (reason != null) return const ActionOutcome.fail('errForbidden');
      final v = state.value;
      if (v != null) state = AsyncData(v.copyWith(isPrivate: private));
      ref.invalidate(myVillagesProvider);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  /// Signed in: ask the owner of this private village to let me in.
  Future<ActionOutcome> requestJoin(String nickname) async {
    final e = nicknameError(nickname);
    if (e != null) return ActionOutcome.fail(e);
    try {
      final role = await _api.requestJoin(villageId, sanitizeText(nickname));
      await refresh(silent: true);
      ref.invalidate(myVillagesProvider);
      return role == null
          ? const ActionOutcome.fail('errNotFound')
          : ActionOutcome.ok(role);
    } catch (err) {
      return ActionOutcome.fail(errorKey(err));
    }
  }

  /// Owner: approve a request, or decline / remove.
  Future<ActionOutcome> decideMember(
    String userId, {
    required bool approve,
  }) async {
    try {
      final ok = await _api.decideMember(villageId, userId, approve: approve);
      ref.invalidate(membersProvider(villageId));
      ref.invalidate(myVillagesProvider);
      return ok
          ? const ActionOutcome.ok()
          : const ActionOutcome.fail('errNotFound');
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }
}

final villageProvider = AsyncNotifierProvider.autoDispose
    .family<VillageNotifier, Village?, String>(VillageNotifier.new);

/// Signs in with Google or Apple. Linking the device happens in [SessionNotifier].
Future<ActionOutcome> signIn(WidgetRef ref, {required bool apple}) async {
  final auth = ref.read(authServiceProvider);
  if (auth == null) return const ActionOutcome.fail('errNoServer');
  try {
    final r = apple
        ? await auth.signInWithApple()
        : await auth.signInWithGoogle();
    return ActionOutcome.ok(r);
  } catch (_) {
    return const ActionOutcome.fail('errSignIn');
  }
}

Future<void> signOut(WidgetRef ref) async {
  await ref.read(authServiceProvider)?.signOut();
}

/// Deletes the account with its villages, houses and photos, then forgets them on this device.
Future<ActionOutcome> deleteAccount(WidgetRef ref) async {
  final auth = ref.read(authServiceProvider);
  final api = ref.read(remoteApiProvider);
  if (auth == null || api == null) {
    return const ActionOutcome.fail('errNoServer');
  }
  List<AccountVillage> mine = const [];
  try {
    mine = await api.myVillages();
  } catch (_) {}
  final appleCode = await auth.appleAuthorizationCode();
  try {
    await api.deleteAccount(
      ref.read(identityProvider).installId,
      appleCode: appleCode,
    );
  } catch (e) {
    return ActionOutcome.fail(errorKey(e));
  }
  final identity = ref.read(identityProvider.notifier);
  for (final v in mine) {
    if (v.role == 'owner') {
      identity.forget(v.id);
    } else if (v.role == 'resident') {
      identity.clearHouse(v.id);
    }
  }
  await auth.signOut();
  return const ActionOutcome.ok();
}
