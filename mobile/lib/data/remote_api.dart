/// Supabase access (prefix snowvill_). Same contract as the web client (src/lib/remote.ts): RPC
/// functions + the snowvill-photo Edge Function. Guests call with the anon key; a signed-in user's
/// access token goes in `Authorization` (docs/12-accounts-and-private-villages.md, "Client contract").
library;

import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' show Offset;

import 'package:http/http.dart' as http;

import 'models.dart';

class RemoteConfig {
  const RemoteConfig({required this.url, required this.anonKey});
  final String url;
  final String anonKey;

  /// Provided at build time: `--dart-define-from-file=env/dev.json` (gitignored).
  static RemoteConfig? fromEnvironment() {
    const url = String.fromEnvironment('SUPABASE_URL');
    const key = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (url.isEmpty || key.isEmpty) return null;
    return RemoteConfig(
      url: url.endsWith('/') ? url.substring(0, url.length - 1) : url,
      anonKey: key,
    );
  }
}

enum RemoteErrorCode {
  invalidInput,
  rateLimited,
  forbidden,
  notFound,
  conflict,
  tooLarge,
  unsupported,
  network,
  server,
}

class RemoteError implements Exception {
  RemoteError(this.code, [this.status = 0]);
  final RemoteErrorCode code;
  final int status;
  @override
  String toString() => 'RemoteError($code, $status)';
}

enum ClaimFailure {
  slotTaken,
  villageFull,
  notFound,
  alreadyJoined,

  /// Private village and the caller is not the owner or an approved member.
  privateVillage,
}

/// A village in the signed-in account's list (`snowvill_my_villages`).
class AccountVillage {
  const AccountVillage({
    required this.id,
    required this.name,
    required this.isPrivate,
    required this.role,
    required this.houses,
    required this.pending,
    required this.createdAt,
  });
  final String id;
  final String name;
  final bool isPrivate;

  /// owner | resident | member | pending.
  final String? role;
  final int houses;

  /// Join requests waiting (owner only).
  final int pending;
  final DateTime createdAt;

  factory AccountVillage.fromJson(Map<String, dynamic> j) => AccountVillage(
    id: j['id'] as String,
    name: j['name'] as String,
    isPrivate: j['visibility'] == 'private',
    role: j['role'] as String?,
    houses: (j['houses'] as num?)?.toInt() ?? 0,
    pending: (j['pending'] as num?)?.toInt() ?? 0,
    createdAt:
        DateTime.tryParse(j['created_at'] as String? ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );
}

/// A join request or approved member of a private village (owner view).
class Member {
  const Member({
    required this.userId,
    required this.nickname,
    required this.approved,
  });
  final String userId;
  final String nickname;
  final bool approved;

  factory Member.fromJson(Map<String, dynamic> j) => Member(
    userId: j['user_id'] as String,
    nickname: j['nickname'] as String,
    approved: j['status'] == 'approved',
  );
}

class ClaimResult {
  ClaimResult.ok(this.house, this.claimSecret) : failure = null;
  ClaimResult.failed(this.failure) : house = null, claimSecret = null;
  final House? house;
  final String? claimSecret;
  final ClaimFailure? failure;
  bool get ok => failure == null;
}

class RemoteApi {
  RemoteApi(this.config, {http.Client? client, this.accessToken})
    : _client = client ?? http.Client();
  final RemoteConfig config;
  final http.Client _client;

  /// The signed-in user's access token (refreshed if needed), or null for a guest.
  final Future<String?> Function()? accessToken;

  Future<Map<String, String>> _headers() async {
    final token = await accessToken?.call();
    return {
      'apikey': config.anonKey,
      'Authorization': 'Bearer ${token ?? config.anonKey}',
    };
  }

  Future<http.Response> _send(Future<http.Response> Function() call) async {
    http.Response res;
    try {
      res = await call().timeout(const Duration(seconds: 20));
    } catch (_) {
      throw RemoteError(RemoteErrorCode.network);
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return res;
    String? bodyCode;
    try {
      final body = jsonDecode(res.body);
      if (body is Map) bodyCode = (body['error'] ?? body['code'])?.toString();
    } catch (_) {}
    throw RemoteError(_codeFor(res.statusCode, bodyCode), res.statusCode);
  }

  static RemoteErrorCode _codeFor(int status, String? body) {
    if (status == 429 || body == 'PT429' || body == 'RATE_LIMITED') {
      return RemoteErrorCode.rateLimited;
    }
    if (status == 400) return RemoteErrorCode.invalidInput;
    if (status == 401 || status == 403) return RemoteErrorCode.forbidden;
    if (status == 404) return RemoteErrorCode.notFound;
    if (status == 409) return RemoteErrorCode.conflict;
    if (status == 413) return RemoteErrorCode.tooLarge;
    if (status == 415) return RemoteErrorCode.unsupported;
    return RemoteErrorCode.server;
  }

  Future<dynamic> _rpc(String fn, Map<String, dynamic> args) async {
    final headers = await _headers();
    final res = await _send(
      () => _client.post(
        Uri.parse('${config.url}/rest/v1/rpc/$fn'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode(args),
      ),
    );
    return res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<dynamic> _photoFn(Map<String, dynamic> body) async {
    final headers = await _headers();
    final res = await _send(
      () => _client.post(
        Uri.parse('${config.url}/functions/v1/snowvill-photo'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ),
    );
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<({String id, String ownerSecret})> createVillage(
    String installId,
    String name,
  ) async {
    final r =
        await _rpc('snowvill_create_village', {
              'p_install_id': installId,
              'p_name': name,
            })
            as Map;
    return (id: r['id'] as String, ownerSecret: r['owner_secret'] as String);
  }

  /// [secrets]: this device's owner / claim secrets for the village (guests of a private village).
  Future<Village?> getVillage(
    String villageId, {
    List<String> secrets = const [],
  }) async {
    final r = await _rpc('snowvill_get_village', {
      'p_village_id': villageId,
      if (secrets.isNotEmpty) 'p_secrets': secrets,
    });
    return r == null
        ? null
        : Village.fromJson(Map<String, dynamic>.from(r as Map));
  }

  Future<ClaimResult> claimHouse(
    String installId,
    String villageId,
    int slot, {
    required String nickname,
    required HouseStyle style,
    required int direction,
    required String message,
  }) async {
    final Map<String, dynamic> r;
    try {
      r = Map<String, dynamic>.from(
        await _rpc('snowvill_claim_house', {
              'p_install_id': installId,
              'p_village_id': villageId,
              'p_slot': slot,
              'p_nickname': nickname,
              'p_style': style.name,
              'p_message': message,
              'p_direction': direction,
            })
            as Map,
      );
    } on RemoteError catch (e) {
      // Private village and not allowed (403), or the account already lives here (409).
      if (e.code == RemoteErrorCode.forbidden) {
        return ClaimResult.failed(ClaimFailure.privateVillage);
      }
      if (e.code == RemoteErrorCode.conflict) {
        return ClaimResult.failed(ClaimFailure.alreadyJoined);
      }
      rethrow;
    }
    if (r['ok'] == true) {
      return ClaimResult.ok(
        House.fromJson(Map<String, dynamic>.from(r['house'] as Map)),
        r['claim_secret'] as String,
      );
    }
    return ClaimResult.failed(switch (r['reason']) {
      'SLOT_TAKEN' || 'SLOT_LOCKED' => ClaimFailure.slotTaken,
      'VILLAGE_FULL' => ClaimFailure.villageFull,
      'ALREADY_JOINED' => ClaimFailure.alreadyJoined,
      _ => ClaimFailure.notFound,
    });
  }

  /// Unspent expansion credits per price tier (1..4).
  Future<Map<int, int>> wallet(String installId) async {
    final r = await _rpc('snowvill_wallet', {'p_install_id': installId}) as Map;
    final tiers = (r['tiers'] as Map?) ?? const {};
    return {
      for (var t = 1; t <= 4; t++) t: ((tiers['$t'] ?? 0) as num).toInt(),
    };
  }

  /// Spends one credit of the tier the village needs to open the next half of [district]. Returns
  /// null on success or a failure reason ('NO_CREDIT' | 'DISTRICT_OPEN' | 'MAX_SIZE' | 'NOT_FOUND').
  Future<String?> upgradeVillage(
    String installId,
    String villageId,
    int district,
  ) async {
    final r = Map<String, dynamic>.from(
      await _rpc('snowvill_upgrade_village', {
            'p_install_id': installId,
            'p_village_id': villageId,
            'p_district': district,
          })
          as Map,
    );
    return r['ok'] == true ? null : r['reason'] as String?;
  }

  /// Owner only: one path style for the whole village and the moved decorations (replaces the old map).
  /// Returns null on success or 'FORBIDDEN' | 'NOT_FOUND'.
  Future<String?> setVillageLook(
    String installId,
    String villageId,
    String? ownerSecret,
    PathStyle pathStyle,
    Map<String, Offset> decor,
  ) async {
    double r2(double v) => (v * 100).roundToDouble() / 100;
    final r = Map<String, dynamic>.from(
      await _rpc('snowvill_set_village_look', {
            'p_install_id': installId,
            'p_village_id': villageId,
            'p_owner_secret': ownerSecret,
            'p_path_style': pathStyle.name,
            'p_decor': {
              for (final MapEntry(:key, :value) in decor.entries)
                key: [r2(value.dx), r2(value.dy)],
            },
          })
          as Map,
    );
    return r['ok'] == true ? null : r['reason'] as String?;
  }

  Future<void> report(String installId, String houseId, String reason) => _rpc(
    'snowvill_report',
    {'p_install_id': installId, 'p_house_id': houseId, 'p_reason': reason},
  );

  /// [secret] may be null for a signed-in resident.
  Future<void> uploadPhoto(
    String installId,
    String houseId,
    String? secret,
    Uint8List jpeg,
  ) async {
    final req =
        http.MultipartRequest(
            'POST',
            Uri.parse('${config.url}/functions/v1/snowvill-photo'),
          )
          ..headers.addAll(await _headers())
          ..fields['install_id'] = installId
          ..fields['house_id'] = houseId
          ..fields.addAll({'secret': ?secret})
          ..files.add(
            http.MultipartFile.fromBytes('file', jpeg, filename: 'photo.jpg'),
          );
    await _send(() async => http.Response.fromStream(await _client.send(req)));
  }

  Future<String> photoUrl(
    String installId,
    String villageId,
    String houseId, {
    List<String> secrets = const [],
  }) async {
    final r = await _photoFn({
      'action': 'view',
      'install_id': installId,
      'village_id': villageId,
      'house_id': houseId,
      if (secrets.isNotEmpty) 'secrets': secrets,
    });
    return (r as Map)['url'] as String;
  }

  /// [secret] may be null for a signed-in resident or owner.
  Future<void> removeHouse(String installId, String houseId, String? secret) =>
      _photoFn({
        'action': 'remove',
        'install_id': installId,
        'house_id': houseId,
        'secret': ?secret,
      });

  /// [secret] may be null for a signed-in owner.
  Future<void> deleteVillage(
    String installId,
    String villageId,
    String? secret,
  ) => _photoFn({
    'action': 'delete_village',
    'install_id': installId,
    'village_id': villageId,
    'secret': ?secret,
  });

  // ------------------------------------------------------------ account (signed in)

  /// Moves what this device made as a guest to the account: villageId → owner secret,
  /// houseId → claim secret.
  Future<({int villages, int houses})> linkDevice(
    Map<String, String> owners,
    Map<String, String> houses,
  ) async {
    final r = await _rpc('snowvill_link_device', {
      'p_owner': owners,
      'p_houses': houses,
    });
    final m = r is Map ? r : const {};
    return (
      villages: (m['villages'] as num?)?.toInt() ?? 0,
      houses: (m['houses'] as num?)?.toInt() ?? 0,
    );
  }

  Future<List<AccountVillage>> myVillages() async {
    final r = await _rpc('snowvill_my_villages', const {});
    return [
      for (final v in (r as List?) ?? const [])
        AccountVillage.fromJson(Map<String, dynamic>.from(v as Map)),
    ];
  }

  /// Signed-in owner only. Returns null on success or 'FORBIDDEN'.
  Future<String?> setVisibility(
    String villageId, {
    required bool private,
  }) async {
    final r = Map<String, dynamic>.from(
      await _rpc('snowvill_set_visibility', {
            'p_village_id': villageId,
            'p_visibility': private ? 'private' : 'public',
          })
          as Map,
    );
    return r['ok'] == true ? null : (r['reason'] as String? ?? 'FORBIDDEN');
  }

  /// Asks to join a private village. Returns the caller's role afterwards (usually 'pending'),
  /// or null when the village is gone or public.
  Future<String?> requestJoin(String villageId, String nickname) async {
    final r = Map<String, dynamic>.from(
      await _rpc('snowvill_request_join', {
            'p_village_id': villageId,
            'p_nickname': nickname,
          })
          as Map,
    );
    return r['ok'] == true ? r['role'] as String? : null;
  }

  /// Owner: pending requests and approved members; null for anyone else.
  Future<List<Member>?> membersOf(String villageId) async {
    final r = await _rpc('snowvill_members_of', {'p_village_id': villageId});
    if (r is! List) return null;
    return [
      for (final m in r) Member.fromJson(Map<String, dynamic>.from(m as Map)),
    ];
  }

  /// Owner: approve a request, or remove (decline a request / remove a member).
  Future<bool> decideMember(
    String villageId,
    String userId, {
    required bool approve,
  }) async {
    final r = await _rpc('snowvill_decide_member', {
      'p_village_id': villageId,
      'p_user_id': userId,
      'p_approve': approve,
    });
    return r is Map && r['ok'] == true;
  }

  /// Deletes the signed-in account, its villages, houses and photos. [appleCode]: a fresh Sign in
  /// with Apple authorization code so the server can revoke the Apple grant (best effort).
  Future<void> deleteAccount(
    String installId, {
    String? appleCode,
  }) => _photoFn({
    'action': 'delete_account',
    'install_id': installId,
    if (appleCode != null) ...{'apple_code': appleCode, 'apple_client': 'app'},
  });
}
