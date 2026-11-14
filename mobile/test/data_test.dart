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

    test('signed in → user token in Authorization, anon key stays in apikey', () async {
      final seen = <http.BaseRequest>[];
      String? token = 'user-jwt';
      final api = RemoteApi(config, accessToken: () async => token, client: MockClient((req) async {
        seen.add(req);
        return http.Response('null', 200);
      }));
      await api.getVillage('x');
      expect(seen.last.headers['apikey'], 'anon');
      expect(seen.last.headers['Authorization'], 'Bearer user-jwt');
      token = null;
      await api.getVillage('x');
      expect(seen.last.headers['Authorization'], 'Bearer anon');
    });

    test('guest secrets go to get_village and photo view; null secrets are left out', () async {
      final bodies = <Map<String, dynamic>>[];
      final api = RemoteApi(config, client: MockClient((req) async {
        bodies.add(jsonDecode(req.body) as Map<String, dynamic>);
        return http.Response(req.url.path.endsWith('snowvill-photo') ? '{"url":"u","ok":true}' : 'null', 200);
      }));
      await api.getVillage('v', secrets: ['s1', 's2']);
      expect(bodies.last, {'p_village_id': 'v', 'p_secrets': ['s1', 's2']});
      await api.getVillage('v');
      expect(bodies.last.containsKey('p_secrets'), isFalse);
      expect(await api.photoUrl('i', 'v', 'h', secrets: ['s1']), 'u');
      expect(bodies.last['secrets'], ['s1']);
      await api.removeHouse('i', 'h', null);
      expect(bodies.last.containsKey('secret'), isFalse);
      await api.deleteVillage('i', 'v', 'sec');
      expect(bodies.last['secret'], 'sec');
    });

    test('get_village: visibility and me; a locked private village has only id, name and role', () async {
      var body = <String, dynamic>{};
      final api = RemoteApi(config, client: MockClient((_) async => http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json; charset=utf-8'})));
      body = {
        'id': 'v', 'name': '마을', 'created_at': '2026-12-01T00:00:00Z', 'visibility': 'private', 'locked': false,
        'me': {'role': 'resident', 'house_id': 'h1'}, 'houses': [],
      };
      final open = (await api.getVillage('v'))!;
      expect([open.isPrivate, open.locked, open.myRole, open.myHouseId], [true, false, 'resident', 'h1']);
      body = {'id': 'v', 'name': '마을', 'visibility': 'private', 'locked': true, 'me': {'role': 'pending', 'house_id': null}};
      final locked = (await api.getVillage('v'))!;
      expect([locked.locked, locked.isPrivate, locked.myRole, locked.myHouseId, locked.houses], [true, true, 'pending', null, isEmpty]);
      body = {'id': 'v', 'name': '마을', 'created_at': '2026-12-01T00:00:00Z', 'houses': []};
      final old = (await api.getVillage('v'))!;
      expect([old.isPrivate, old.locked, old.myRole], [false, false, null]);
    });

    test('claim: 403 → private village, 409 → already lives here', () async {
      for (final (status, failure) in [(403, ClaimFailure.privateVillage), (409, ClaimFailure.alreadyJoined)]) {
        final api = RemoteApi(config, client: MockClient((_) async => http.Response('{"code":"x"}', status)));
        final r = await api.claimHouse('i', 'v', 0, nickname: 'n', style: HouseStyle.wood, direction: 0, message: '');
        expect(r.failure, failure);
      }
    });

    test('account calls: link, my villages, members, decide, visibility, join, delete', () async {
      final calls = <String, Map<String, dynamic>>{};
      final api = RemoteApi(config, accessToken: () async => 't', client: MockClient((req) async {
        final fn = req.url.pathSegments.last;
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        calls[fn == 'snowvill-photo' ? body['action'] as String : fn] = body;
        return http.Response(switch (fn) {
          'snowvill_link_device' => '{"villages":1,"houses":2}',
          'snowvill_my_villages' => jsonEncode([
              {'id': 'v', 'name': '마을', 'capacity': 6, 'visibility': 'private', 'created_at': '2026-12-01T00:00:00Z', 'role': 'owner', 'houses': 3, 'pending': 2},
            ]),
          'snowvill_members_of' => jsonEncode([
              {'user_id': 'u1', 'nickname': '눈', 'status': 'pending', 'created_at': '2026-12-01T00:00:00Z'},
              {'user_id': 'u2', 'nickname': '별', 'status': 'approved', 'created_at': '2026-12-01T00:00:00Z'},
            ]),
          'snowvill_set_visibility' => '{"ok":false,"reason":"FORBIDDEN"}',
          'snowvill_request_join' => '{"ok":true,"role":"pending"}',
          _ => '{"ok":true}',
        }, 200, headers: {'content-type': 'application/json; charset=utf-8'});
      }));
      expect(await api.linkDevice({'v': 'os'}, {'h': 'cs'}), (villages: 1, houses: 2));
      expect(calls['snowvill_link_device'], {'p_owner': {'v': 'os'}, 'p_houses': {'h': 'cs'}});
      final mine = (await api.myVillages()).single;
      expect([mine.id, mine.isPrivate, mine.role, mine.houses, mine.pending], ['v', true, 'owner', 3, 2]);
      final members = (await api.membersOf('v'))!;
      expect(members.map((m) => (m.userId, m.nickname, m.approved)), [('u1', '눈', false), ('u2', '별', true)]);
      expect(await api.decideMember('v', 'u1', approve: true), isTrue);
      expect(calls['snowvill_decide_member'], {'p_village_id': 'v', 'p_user_id': 'u1', 'p_approve': true});
      expect(await api.setVisibility('v', private: true), 'FORBIDDEN');
      expect(calls['snowvill_set_visibility'], {'p_village_id': 'v', 'p_visibility': 'private'});
      expect(await api.requestJoin('v', '눈'), 'pending');
      await api.deleteAccount('i', appleCode: 'code');
      expect(calls['delete_account'], {'action': 'delete_account', 'install_id': 'i', 'apple_code': 'code', 'apple_client': 'app'});
      await api.deleteAccount('i');
      expect(calls['delete_account'], {'action': 'delete_account', 'install_id': 'i'});
    });
  });
}
