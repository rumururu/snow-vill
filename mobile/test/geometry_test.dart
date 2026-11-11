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
      g.parts.fence, g.parts.post, g.parts.gate,
    };
    for (final s in used) {
      expect(g.sprites[s], isNotNull, reason: s);
      expect(File(g.sprites[s]!.asset).existsSync(), isTrue, reason: g.sprites[s]!.asset);
    }
    expect(File(g.snowTexture).existsSync(), isTrue);
  });

  test('free village: district 0 lots, plaza + district 0 ground, fence with one gate', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const []);
    expect(g.visibleLots(v.openHalves).map((l) => l.slot), [0, 1, 2, 3, 4, 5]);
    expect(g.openCells(v.openHalves), hasLength(2));
    final fences = g.fencePieces(v.openHalves);
    expect(fences.where((p) => p.kind == 'gate'), hasLength(1));
    expect(fences.where((p) => p.kind == 'post'), isNotEmpty);
    final edges = g.groundEdges(v.openHalves);
    expect(edges.inner, hasLength(1)); // plaza ↔ district 0
    expect(edges.outer, hasLength(6));
  });

  test('opening a district adds its lots, facility and moves the fence outward', () {
    final open = openNextHalf(freeOpenHalves, 2)!;
    expect(g.visibleLots(open).map((l) => l.slot).toList()..sort(), [0, 1, 2, 3, 4, 5, 12, 13, 14]);
    expect(g.facilitiesFor(open).map((f) => f.sprite), contains('landmark_santa'));
    expect(g.openCells(open), hasLength(3));
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
    expect(g.slotAt(v, project(l.i, l.j)), 3);
    final d = g.districts[4];
    expect(g.districtAt(v, project(d.i, d.j)), 4);
  });

  test('painter order is back to front', () {
    final v = Village(id: 'x', name: 'x', createdAt: DateTime(2026), houses: const [], openHalves: (1 << 20) - 1);
    final depth = g.mapOrder(v).map((e) => e.depth).toList();
    expect(depth, [...depth]..sort());
  });
}
