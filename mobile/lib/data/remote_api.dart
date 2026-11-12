/// Supabase access (shared mkideabox-games project, prefix snowvill_). Same contract as the
/// web client (src/lib/remote.ts): anon RPC functions + the snowvill-photo Edge Function.
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

enum ClaimFailure { slotTaken, villageFull, notFound, alreadyJoined }

class ClaimResult {
  ClaimResult.ok(this.house, this.claimSecret) : failure = null;
  ClaimResult.failed(this.failure) : house = null, claimSecret = null;
  final House? house;
  final String? claimSecret;
  final ClaimFailure? failure;
  bool get ok => failure == null;
}

class RemoteApi {
  RemoteApi(this.config, {http.Client? client})
    : _client = client ?? http.Client();
  final RemoteConfig config;
  final http.Client _client;

  Map<String, String> get _headers => {
    'apikey': config.anonKey,
    'Authorization': 'Bearer ${config.anonKey}',
  };

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
    if (status == 403) return RemoteErrorCode.forbidden;
    if (status == 404) return RemoteErrorCode.notFound;
    if (status == 413) return RemoteErrorCode.tooLarge;
    if (status == 415) return RemoteErrorCode.unsupported;
    return RemoteErrorCode.server;
  }

  Future<dynamic> _rpc(String fn, Map<String, dynamic> args) async {
    final res = await _send(
      () => _client.post(
        Uri.parse('${config.url}/rest/v1/rpc/$fn'),
        headers: {..._headers, 'Content-Type': 'application/json'},
        body: jsonEncode(args),
      ),
    );
    return res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<dynamic> _photoFn(Map<String, dynamic> body) async {
    final res = await _send(
      () => _client.post(
        Uri.parse('${config.url}/functions/v1/snowvill-photo'),
        headers: {..._headers, 'Content-Type': 'application/json'},
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

  Future<Village?> getVillage(String villageId) async {
    final r = await _rpc('snowvill_get_village', {'p_village_id': villageId});
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
    final r = Map<String, dynamic>.from(
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
    String ownerSecret,
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

  Future<void> uploadPhoto(
    String installId,
    String houseId,
    String secret,
    Uint8List jpeg,
  ) async {
    final req =
        http.MultipartRequest(
            'POST',
            Uri.parse('${config.url}/functions/v1/snowvill-photo'),
          )
          ..headers.addAll(_headers)
          ..fields['install_id'] = installId
          ..fields['house_id'] = houseId
          ..fields['secret'] = secret
          ..files.add(
            http.MultipartFile.fromBytes('file', jpeg, filename: 'photo.jpg'),
          );
    await _send(() async => http.Response.fromStream(await _client.send(req)));
  }

  Future<String> photoUrl(
    String installId,
    String villageId,
    String houseId,
  ) async {
    final r = await _photoFn({
      'action': 'view',
      'install_id': installId,
      'village_id': villageId,
      'house_id': houseId,
    });
    return (r as Map)['url'] as String;
  }

  Future<void> removeHouse(String installId, String houseId, String secret) =>
      _photoFn({
        'action': 'remove',
        'install_id': installId,
        'house_id': houseId,
        'secret': secret,
      });

  Future<void> deleteVillage(
    String installId,
    String villageId,
    String secret,
  ) => _photoFn({
    'action': 'delete_village',
    'install_id': installId,
    'village_id': villageId,
    'secret': secret,
  });
}
