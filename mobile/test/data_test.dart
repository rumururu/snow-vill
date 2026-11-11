import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:snow_village/data/models.dart';
import 'package:snow_village/data/remote_api.dart';
import 'package:snow_village/data/validation.dart';
import 'package:snow_village/ui/common.dart';

void main() {
  group('validation (same rules as web + server)', () {
    test('village name', () {
      expect(villageNameError('   '), 'nameRequired');
      expect(villageNameError('가' * 20), isNull);
      expect(villageNameError('가' * 21), 'nameTooLong');
      expect(sanitizeText('  우리\n\t마을 '), '우리 마을');
    });
    test('nickname / message, counted in code points', () {
      expect(nicknameError(''), 'nicknameRequired');
      expect(nicknameError('가' * 11), 'nicknameTooLong');
      expect(messageError('눈' * 60), isNull);
      expect(messageError('눈' * 61), 'messageTooLong');
      expect(charLength('👨‍👩‍👧'), 5);
    });
  });

  test('free village = district 0; each step opens the next half of a chosen district (same as the server)', () {
    House h(int slot) => House(id: 'h$slot', slot: slot, nickname: 'n', style: HouseStyle.wood, direction: 0, message: '', hasPhoto: false, createdAt: DateTime(2026));
    final free = Village(id: 'v', name: 'v', createdAt: DateTime(2026), houses: [for (var i = 0; i < 6; i++) h(i)]);
    expect(free.capacity, freeCapacity);
    expect(free.isFull, isTrue);
    expect(free.freeSlots, isEmpty);
    expect(free.lockedSlots, hasLength(54));
    expect(free.canUpgrade, isTrue);
    final open = openNextHalf(free.openHalves, 2)!;
    final grown = free.copyWith(openHalves: open);
    expect(grown.capacity, 9);
    expect(grown.freeSlots, [12, 13, 14]);
    expect(openNextHalf(openNextHalf(open, 2)!, 2), isNull);
    expect(openNextHalf(free.openHalves, 0), isNull);
    expect([6, 9, 12, 15, 18, 57, 60].map(stepTier), [1, 2, 3, 4, 4, 4, 0]);
    expect(Village.fromJson({'id': 'x', 'name': 'x', 'created_at': '2026-12-01T00:00:00Z', 'open_halves': 259, 'houses': []}).capacity, 9);
    expect(Village.fromJson({'id': 'x', 'name': 'x', 'created_at': '2026-12-01T00:00:00Z', 'capacity': 12, 'houses': []}).openHalves, 15);
    expect(Village.fromJson({'id': 'x', 'name': 'x', 'created_at': '2026-12-01T00:00:00Z', 'houses': []}).capacity, 6);
  });

  test('invite link parsing', () {
    expect(parseVillageId('https://snow.mkideabox.com/v/?id=abcdefghjk&src=invite_copy'), 'abcdefghjk');
    expect(parseVillageId('abcdefghjk'), 'abcdefghjk');
    expect(parseVillageId('https://evil.example/?x=1'), isNull);
    expect(parseVillageId('ABCDEFGHJK'), isNull);
  });

  group('remote api', () {
    const config = RemoteConfig(url: 'https://p.supabase.co', anonKey: 'anon');

    test('get village maps JSON and sends the anon key', () async {
      late http.Request seen;
      final api = RemoteApi(config, client: MockClient((req) async {
        seen = req;
        return http.Response(
          jsonEncode({
            'id': 'abcdefghjk',
            'name': '마을',
            'created_at': '2026-12-01T00:00:00Z',
            'houses': [
              {'id': 'h1', 'slot': 3, 'nickname': '하늘', 'style': 'sage', 'message': '', 'has_photo': true, 'created_at': '2026-12-01T00:00:00Z'}
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }));
      final v = await api.getVillage('abcdefghjk');
      expect(seen.url.toString(), 'https://p.supabase.co/rest/v1/rpc/snowvill_get_village');
      expect(seen.headers['apikey'], 'anon');
      expect(v!.houseAt(3)!.style, HouseStyle.sage);
      expect(v.houseAt(3)!.hasPhoto, isTrue);
      expect(v.freeSlots, [0, 1, 2, 4, 5]);
      expect(v.houseAt(3)!.direction, 0);
    });

    test('missing village → null; claim collision → slotTaken', () async {
      final api = RemoteApi(config, client: MockClient((req) async {
        if (req.url.path.endsWith('snowvill_get_village')) return http.Response('null', 200);
        return http.Response(jsonEncode({'ok': false, 'reason': 'SLOT_TAKEN'}), 200);
      }));
      expect(await api.getVillage('x'), isNull);
      final r = await api.claimHouse('i', 'v', 0, nickname: 'n', style: HouseStyle.wood, direction: 2, message: '');
      expect(r.ok, isFalse);
      expect(r.failure, ClaimFailure.slotTaken);
    });

    test('HTTP errors map to codes', () async {
      for (final (status, body, code) in [
        (429, '{"code":"PT429"}', RemoteErrorCode.rateLimited),
        (400, '{"code":"22023"}', RemoteErrorCode.invalidInput),
        (403, '{"error":"FORBIDDEN"}', RemoteErrorCode.forbidden),
        (500, '{}', RemoteErrorCode.server),
      ]) {
        final api = RemoteApi(config, client: MockClient((_) async => http.Response(body, status)));
        await expectLater(api.getVillage('x'), throwsA(isA<RemoteError>().having((e) => e.code, 'code', code)));
      }
    });
  });
}
