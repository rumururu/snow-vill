import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:snow_village/scene/geometry.dart';

void main() {
  // Same JSON the web uses (scripts/build_assets.py output).
  final geometry = SceneGeometry.fromJson(jsonDecode(File('assets/art/asset-geometry.json').readAsStringSync()) as Map<String, dynamic>);

  test('8 slots inside the 1024 world, back → front order matching the web', () {
    expect(geometry.slots, hasLength(8));
    for (final s in geometry.slots) {
      expect(s.hit.left, greaterThanOrEqualTo(0));
      expect(s.hit.right, lessThanOrEqualTo(worldSize));
      expect(s.hit.bottom, lessThanOrEqualTo(worldSize));
    }
    final order = geometry.renderOrder().map((e) => e is TreeEntity ? 'tree' : (e as HouseEntity).slot).toList();
    expect(order, [0, 1, 2, 3, 'tree', 4, 5, 6, 7]);
  });

  test('tap at each house centre resolves to that house (front-most wins)', () {
    for (final s in geometry.slots) {
      final centre = Offset(s.hit.center.dx, s.hit.top + s.hit.height * 0.45);
      expect(geometry.slotAt(centre), s.slot, reason: 'slot ${s.slot}');
    }
    expect(geometry.slotAt(const Offset(5, 5)), isNull);
  });

  test('tap regions stay ≥ 44 logical px on a 320-wide phone', () {
    for (final s in geometry.slots) {
      expect(s.hit.width * 312 / worldSize, greaterThanOrEqualTo(44));
      expect(s.hit.height * 312 / worldSize, greaterThanOrEqualTo(44));
    }
  });

  test('sprites resolve to bundled assets', () {
    for (final g in geometry.sprites.values) {
      expect(File(g.asset).existsSync(), isTrue, reason: g.asset);
    }
    expect(File(geometry.background).existsSync(), isTrue);
  });
}
