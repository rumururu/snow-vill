import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:snow_village/data/models.dart';
import 'package:snow_village/scene/geometry.dart';

void main() {
  final g = VillageGeometry.fromJson(jsonDecode(File('assets/v2/village-geometry.json').readAsStringSync()) as Map<String, dynamic>);

  test('60 lots in 10 districts, same layout as the web', () {
    expect(g.lots, hasLength(maxCapacity));
    expect(g.districts, hasLength(districtCount));
    for (final l in g.lots) {
      expect(l.district, l.slot ~/ 6);
      expect(l.half, l.slot % 6 < 3 ? 0 : 1);
    }
  });

  test('every sprite the map uses is bundled', () {
    final used = {
      for (final h in g.houses.values) ...[h.a, h.b],
      for (final f in g.plaza) f.sprite,
      for (final d in g.districts) ...[if (d.facility != null) d.facility!.sprite, for (final x in d.decor) x.sprite],
      for (final t in g.forest) t.sprite,
    };
    for (final s in used) {
      expect(g.sprites[s], isNotNull, reason: s);
      expect(File(g.sprites[s]!.asset).existsSync(), isTrue, reason: g.sprites[s]!.asset);
    }
    expect(File(g.snowTexture).existsSync(), isTrue);
  });

  test('free village: district 0 lots inside one village shape with the plaza', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const []);
    expect(g.visibleLots(v.openHalves).map((l) => l.slot), [0, 1, 2, 3, 4, 5]);
    final shape = g.villageShape(v.openHalves);
    expect(pointInPolygon(Offset.zero, shape), isTrue);
    for (final l in g.visibleLots(v.openHalves)) {
      expect(pointInPolygon(Offset(l.i, l.j), shape), isTrue, reason: 'lot ${l.slot}');
    }
    // the cathedral stands on the raised plaza
    expect(g.plaza.firstWhere((f) => f.id == 'cathedral').z, g.plazaArea.z);
    expect(g.plazaArea.z, greaterThan(0));
  });

  test('opening a district grows the one shape, clears its trees and adds its landmark', () {
    final free = g.forestFor(freeOpenHalves);
    final open = openNextHalf(freeOpenHalves, 2)!;
    expect(g.visibleLots(open).map((l) => l.slot).toList()..sort(), [0, 1, 2, 3, 4, 5, 12, 13, 14]);
    expect(g.facilitiesFor(open).map((f) => f.sprite), contains('landmark_santa'));
    final shape = g.villageShape(open);
    for (final l in g.visibleLots(open)) {
      expect(pointInPolygon(Offset(l.i, l.j), shape), isTrue, reason: 'lot ${l.slot}');
    }
    final trees = g.forestFor(open, shape);
    expect(trees.length, lessThan(free.length));
    for (final t in trees) {
      expect(pointInPolygon(Offset(t.i, t.j), shape), isFalse);
    }
  });

  test('landmarks stay small next to houses', () {
    for (final f in [...g.plaza, for (final d in g.districts) ?d.facility]) {
      expect(f.tiles, lessThanOrEqualTo(2.5), reason: f.sprite);
    }
  });

  test('house view: A/B with mirroring for every type and direction', () {
    for (final s in HouseStyle.values) {
      for (final d in [0, 1, 2, 3]) {
        final v = g.houseView(s, d);
        expect(g.sprites[v.sprite], isNotNull, reason: '$s/$d');
        expect(v.mirror, d == 1 || d == 3);
      }
    }
  });

  test('tap resolution: lot under its centre; closed district under its centre', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const []);
    final l = g.lots[3];
    expect(g.slotAt(v, project(l.i, l.j, l.z)), 3);
    final d = g.districts[4];
    expect(g.districtAt(v, project(d.i, d.j, d.z)), 4);
  });

  test('painter order is back to front', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const [], openHalves: (1 << 20) - 1);
    final depth = g.mapOrder(v).map((e) => e.depth).toList();
    expect(depth, [...depth]..sort());
  });
}
