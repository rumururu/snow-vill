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

  test('free village: district 0 lots inside one village shape, no plaza yet', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const []);
    expect(g.visibleLots(v.openHalves).map((l) => l.slot), [0, 1, 2, 3, 4, 5]);
    final shape = g.villageShape(v.openHalves);
    expect(pointInPolygon(Offset.zero, shape), isFalse);
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

  test('village look: default decoration spots pass the placement rule (same rule as the web)', () {
    for (final open in [freeOpenHalves, (1 << 20) - 1]) {
      for (final f in g.movableDecor(open)) {
        expect(g.decorSpotOk(open, const {}, f.id, Offset(f.i, f.j)), isTrue, reason: f.id);
      }
    }
    // Same count as the web's movableDecor for an all-open village (36 since the 2026-11-14 decor trim).
    expect(g.movableDecor((1 << 20) - 1), hasLength(36));
  });

  test('village look: blocked spots and moved decorations', () {
    const open = freeOpenHalves;
    final d0 = g.districts[0];
    final id = g.movableDecor(open).firstWhere((f) => f.id.startsWith('d0-')).id;
    expect(g.decorSpotOk(open, const {}, id, Offset(g.lots[0].i, g.lots[0].j)), isFalse);
    expect(g.decorSpotOk(open, const {}, id, Offset(d0.path[12].$1, d0.path[12].$2)), isFalse);
    expect(g.decorSpotOk(open, const {}, id, Offset(d0.i, d0.j)), isFalse);
    expect(g.decorSpotOk(open, const {}, id, Offset.zero), isFalse);
    expect(g.decorSpotOk(open, const {}, id, const Offset(-14, -14)), isFalse);
    expect(g.decorSpotOk(open, const {}, 'plaza-bench', const Offset(-0.9, -0.9)), isFalse);
    expect(g.decorSpotOk(open, const {}, 'cathedral', const Offset(0.5, 2.5)), isFalse);
    final moved = g.facilitiesFor(open | (1 << 2), const {'plaza-bench': Offset(1, 2.4), 'cathedral': Offset(5, 5)});
    expect(moved.firstWhere((f) => f.id == 'plaza-bench').i, 1);
    expect(moved.firstWhere((f) => f.id == 'cathedral').i, isNot(5));
    final p = project(1.2, -3.4, 0.55);
    final back = groundAt(p, 0.55);
    expect(back.dx, closeTo(1.2, 1e-9));
    expect(back.dy, closeTo(-3.4, 1e-9));
  });

  test('village look: server JSON (unknown style → dirt, malformed decor dropped)', () {
    final v = Village.fromJson({
      'id': 'abcdefghjk', 'name': 'x', 'created_at': '2026-11-11T00:00:00Z', 'houses': const [],
      'path_style': 'gold',
      'decor': {'plaza-bench': [1, 2], 'cathedral': [0, 0], 'd0-decor1': ['x', 1]},
    });
    expect(v.pathStyle, PathStyle.dirt);
    expect(v.decor, {'plaza-bench': const Offset(1, 2)});
    expect(Village.fromJson({'id': 'a', 'name': 'x', 'created_at': '2026-11-11T00:00:00Z', 'path_style': 'brick'}).pathStyle, PathStyle.brick);
  });

  test('free village = the first concept: tree in the middle, fenced, no plaza until another district opens', () {
    const free = 3; // district 0, both halves
    final bigger = free | (1 << 2);
    expect(plazaShown(free), isFalse);
    expect(plazaShown(bigger), isTrue);
    expect(g.facilitiesFor(free).where((f) => !f.id.contains('decor')).map((f) => f.sprite).toList(), ['tree_complete']);
    expect(g.facilitiesFor(bigger).map((f) => f.id), contains('cathedral'));
    expect(pointInPolygon(Offset.zero, g.villageShape(free)), isFalse);
    expect(pointInPolygon(Offset.zero, g.villageShape(bigger)), isTrue);
    final onPlaza = g.forest.where((t) => t.plaza).length;
    expect(onPlaza, greaterThan(10));
    expect(g.forestFor(free).where((t) => t.plaza).length, onPlaza);
    expect(g.forestFor(bigger).where((t) => t.plaza), isEmpty);
    final shape = g.villageShape(free);
    final runs = villageFence(shape);
    expect(runs, hasLength(1));
    expect(runs.first.length, greaterThan(30));
    for (final p in runs.first) {
      expect(pointInPolygon(p, shape), isTrue);
    }
  });
}
