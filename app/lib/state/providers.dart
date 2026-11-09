import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/identity_store.dart';
import '../data/models.dart';
import '../data/remote_api.dart';
import '../data/validation.dart';
import '../scene/geometry.dart';

/// Overridden in main() with the loaded instance.
final prefsProvider = Provider<SharedPreferences>((ref) => throw UnimplementedError('prefsProvider not overridden'));

final remoteApiProvider = Provider<RemoteApi?>((ref) {
  final config = RemoteConfig.fromEnvironment();
  return config == null ? null : RemoteApi(config);
});

final sceneGeometryProvider = FutureProvider<SceneGeometry>((ref) => SceneGeometry.load());

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
    _set(state.copyWith(villages: [KnownVillage(id: v.id, name: v.name, lastOpened: DateTime.now()), ...rest]));
  }

  void forget(String villageId) {
    _set(state.copyWith(
      villages: state.villages.where((k) => k.id != villageId).toList(),
      owners: Map.of(state.owners)..remove(villageId),
      houses: Map.of(state.houses)..remove(villageId),
    ));
  }

  void setOwner(String villageId, String secret) => _set(state.copyWith(owners: {...state.owners, villageId: secret}));

  void setHouse(String villageId, String houseId, String secret) =>
      _set(state.copyWith(houses: {...state.houses, villageId: (houseId: houseId, secret: secret)}));

  void clearHouse(String villageId) => _set(state.copyWith(houses: Map.of(state.houses)..remove(villageId)));
}

final identityProvider = NotifierProvider<IdentityNotifier, Identity>(IdentityNotifier.new);

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
    final r = await api.createVillage(ref.read(identityProvider).installId, sanitizeText(rawName));
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

  @override
  Future<Village?> build() async {
    _poll?.cancel();
    // Friends' new houses show up without pulling to refresh.
    _poll = Timer.periodic(const Duration(seconds: 20), (_) => refresh(silent: true));
    ref.onDispose(() => _poll?.cancel());
    final v = await _api.getVillage(villageId);
    if (v != null) ref.read(identityProvider.notifier).remember(v);
    return v;
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent && !state.hasValue) state = const AsyncLoading<Village?>();
    final next = await AsyncValue.guard(() => _api.getVillage(villageId));
    // Keep showing the last good village if a background refresh fails.
    if (next.hasError && state.hasValue && silent) return;
    state = next;
  }

  Future<ActionOutcome> claim(int slot, {required String nickname, required HouseStyle style, required String message, Uint8List? photo}) async {
    final e = nicknameError(nickname) ?? messageError(message);
    if (e != null) return ActionOutcome.fail(e);
    ClaimResult r;
    try {
      r = await _api.claimHouse(_identity.installId, villageId, slot,
          nickname: sanitizeText(nickname), style: style, message: sanitizeText(message, multiline: true));
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
      });
    }
    ref.read(identityProvider.notifier).setHouse(villageId, r.house!.id, r.claimSecret!);
    String? photoError;
    if (photo != null) {
      try {
        await _api.uploadPhoto(_identity.installId, r.house!.id, r.claimSecret!, photo);
      } catch (err) {
        photoError = errorKey(err);
      }
    }
    await refresh(silent: true);
    return ActionOutcome.ok((house: r.house!, photoError: photoError));
  }

  Future<ActionOutcome> uploadPhoto(String houseId, Uint8List jpeg) async {
    final mine = _identity.houses[villageId];
    if (mine == null || mine.houseId != houseId) return const ActionOutcome.fail('errForbidden');
    try {
      await _api.uploadPhoto(_identity.installId, houseId, mine.secret, jpeg);
      await refresh(silent: true);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }

  Future<String> photoUrl(String houseId) => _api.photoUrl(_identity.installId, villageId, houseId);

  Future<ActionOutcome> removeHouse(String houseId) async {
    final mine = _identity.houses[villageId];
    final secret = mine?.houseId == houseId ? mine!.secret : _identity.owners[villageId];
    if (secret == null) return const ActionOutcome.fail('errForbidden');
    try {
      await _api.removeHouse(_identity.installId, houseId, secret);
      if (mine?.houseId == houseId) ref.read(identityProvider.notifier).clearHouse(villageId);
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

  Future<ActionOutcome> deleteVillage() async {
    final secret = _identity.owners[villageId];
    if (secret == null) return const ActionOutcome.fail('errForbidden');
    try {
      await _api.deleteVillage(_identity.installId, villageId, secret);
      ref.read(identityProvider.notifier).forget(villageId);
      return const ActionOutcome.ok();
    } catch (e) {
      return ActionOutcome.fail(errorKey(e));
    }
  }
}

final villageProvider = AsyncNotifierProvider.autoDispose.family<VillageNotifier, Village?, String>(VillageNotifier.new);
