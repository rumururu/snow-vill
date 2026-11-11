/// Per-device identity: random install id, ownership secrets and the list of villages this
/// device knows. Same model as the web's localStorage identity (no accounts).
library;

import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

class KnownVillage {
  const KnownVillage({
    required this.id,
    required this.name,
    required this.lastOpened,
  });
  final String id;
  final String name;
  final DateTime lastOpened;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'lastOpened': lastOpened.toIso8601String(),
  };
  factory KnownVillage.fromJson(Map<String, dynamic> j) => KnownVillage(
    id: j['id'] as String,
    name: j['name'] as String,
    lastOpened: DateTime.parse(j['lastOpened'] as String),
  );
}

class Identity {
  const Identity({
    required this.installId,
    required this.owners,
    required this.houses,
    required this.villages,
  });

  final String installId;

  /// villageId → owner secret.
  final Map<String, String> owners;

  /// villageId → (houseId, claim secret).
  final Map<String, ({String houseId, String secret})> houses;

  /// Villages opened on this device, most recent first.
  final List<KnownVillage> villages;

  Identity copyWith({
    Map<String, String>? owners,
    Map<String, ({String houseId, String secret})>? houses,
    List<KnownVillage>? villages,
  }) => Identity(
    installId: installId,
    owners: owners ?? this.owners,
    houses: houses ?? this.houses,
    villages: villages ?? this.villages,
  );
}

class IdentityStore {
  IdentityStore(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'snowvill.identity.v1';

  static String newUuid() {
    final r = Random.secure();
    final b = List<int>.generate(16, (_) => r.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
    return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
  }

  Identity load() {
    final raw = _prefs.getString(_key);
    if (raw != null) {
      try {
        final j = jsonDecode(raw) as Map<String, dynamic>;
        return Identity(
          installId: j['installId'] as String,
          owners: Map<String, String>.from(j['owners'] as Map? ?? {}),
          houses: (j['houses'] as Map? ?? {}).map(
            (k, v) => MapEntry(k as String, (
              houseId: (v as Map)['houseId'] as String,
              secret: v['secret'] as String,
            )),
          ),
          villages: ((j['villages'] as List?) ?? [])
              .map(
                (v) =>
                    KnownVillage.fromJson(Map<String, dynamic>.from(v as Map)),
              )
              .toList(),
        );
      } catch (_) {
        // Corrupt data: start fresh rather than crash.
      }
    }
    final fresh = Identity(
      installId: newUuid(),
      owners: const {},
      houses: const {},
      villages: const [],
    );
    save(fresh);
    return fresh;
  }

  void save(Identity id) {
    _prefs.setString(
      _key,
      jsonEncode({
        'installId': id.installId,
        'owners': id.owners,
        'houses': id.houses.map(
          (k, v) => MapEntry(k, {'houseId': v.houseId, 'secret': v.secret}),
        ),
        'villages': id.villages.map((v) => v.toJson()).toList(),
      }),
    );
  }
}
