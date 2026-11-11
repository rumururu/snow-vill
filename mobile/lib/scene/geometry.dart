/// Village map geometry — port of the web's src/lib/map.ts, driven by the same
/// village-geometry.json written by scripts/build_village.py (copied to assets/v2/).
///
/// World units: one ground tile is [tile] wide on screen. Ground point (i, j) in tile units projects to
///   x = (i - j) * tile / 2,  y = (i + j) * tile / 4     (2:1 isometric, plaza centre at 0,0)
library;

import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/services.dart' show rootBundle;

import '../data/models.dart';

const double tile = 100;

/// On-screen house size in tiles (same as the web).
const double houseTiles = 1.7;
const double segTiles = 2.05;

String assetOf(String src) => src.replaceFirst('/assets/', 'assets/');

class SpriteGeometry {
  SpriteGeometry({
    required this.asset,
    required this.anchor,
    required this.tileWidth,
    required this.bbox,
    required this.hull,
    required this.aspect,
    this.baseSlope,
  });
  final String asset;
  final Offset anchor; // normalised
  final double tileWidth; // normalised
  final List<double> bbox; // normalised x0, y0, x1, y1
  final List<Offset> hull; // normalised
  final double aspect; // canvas height / width
  final double? baseSlope;

  factory SpriteGeometry.fromJson(Map<String, dynamic> j) => SpriteGeometry(
    asset: assetOf(j['src'] as String),
    anchor: Offset(
      (j['anchor'][0] as num).toDouble(),
      (j['anchor'][1] as num).toDouble(),
    ),
    tileWidth: (j['tileWidth'] as num).toDouble(),
    bbox: [for (final v in j['bbox'] as List) (v as num).toDouble()],
    hull: (j['hull'] as List)
        .map((p) => Offset((p[0] as num).toDouble(), (p[1] as num).toDouble()))
        .toList(),
    aspect: (j['aspect'] as num?)?.toDouble() ?? 1,
    baseSlope: (j['baseSlope'] as num?)?.toDouble(),
  );
}

Offset project(double i, double j) =>
    Offset((i - j) * tile / 2, (i + j) * tile / 4);

/// Diamond outline of a ground tile (footprint) centred on (i, j), [size] tiles wide.
List<Offset> tileDiamond(double i, double j, [double size = 1]) {
  final h = size / 2;
  return [
    project(i - h, j - h),
    project(i + h, j - h),
    project(i + h, j + h),
    project(i - h, j + h),
  ];
}

class LotDef {
  const LotDef({
    required this.slot,
    required this.district,
    required this.half,
    required this.i,
    required this.j,
    required this.facing,
  });
  final int slot;
  final int district;
  final int half;
  final double i;
  final double j;
  final int facing;
  double get depth => i + j;
}

class FacilityDef {
  const FacilityDef({
    required this.id,
    required this.sprite,
    required this.i,
    required this.j,
    required this.tiles,
  });
  final String id;
  final String sprite;
  final double i;
  final double j;
  final double tiles;
  double get depth => i + j;
}

class DistrictDef {
  const DistrictDef({
    required this.index,
    required this.id,
    required this.nameKo,
    required this.nameEn,
    required this.i,
    required this.j,
    required this.gi,
    required this.gj,
    required this.facility,
    required this.decor,
  });
  final int index;
  final String id;
  final String nameKo;
  final String nameEn;
  final double i;
  final double j;
  final int gi;
  final int gj;
  final FacilityDef? facility;
  final List<FacilityDef> decor;
}

class Edge {
  const Edge(this.a, this.b, this.axisI, this.front);
  final Offset a; // ground (i, j)
  final Offset b;
  final bool axisI; // runs along i (screen ↘) — otherwise along j (screen ↙)
  final bool front; // faces the viewer
}

class FencePiece {
  const FencePiece(this.kind, this.i, this.j, this.mirror, this.depth);
  final String kind; // fence | post | gate
  final double i;
  final double j;
  final bool mirror;
  final double depth;
}

sealed class MapEntity {
  const MapEntity(this.depth);
  final double depth;
}

class HouseEntity extends MapEntity {
  const HouseEntity(this.lot) : super(0);
  final LotDef lot;
  @override
  double get depth => lot.depth;
}

class LotEntity extends MapEntity {
  const LotEntity(this.lot) : super(0);
  final LotDef lot;
  @override
  double get depth => lot.depth;
}

class FacilityEntity extends MapEntity {
  const FacilityEntity(this.facility) : super(0);
  final FacilityDef facility;
  @override
  double get depth => facility.depth;
}

class FenceEntity extends MapEntity {
  const FenceEntity(this.piece) : super(0);
  final FencePiece piece;
  @override
  double get depth => piece.depth;
}

class VillageGeometry {
  VillageGeometry._(
    this.sprites,
    this.houses,
    this.lots,
    this.districts,
    this.plaza,
    this.plotTiles,
    this.parts,
    this.snowTexture,
    this.auroraMinHouses,
    this.rinkFrames,
  );

  final Map<String, SpriteGeometry> sprites;
  final Map<String, ({String a, String b, String ko, String en})> houses;
  final List<LotDef> lots;
  final List<DistrictDef> districts;
  final List<FacilityDef> plaza;
  final double plotTiles;
  final ({String fence, String post, String gate}) parts;
  final String snowTexture;
  final int auroraMinHouses;
  final List<String> rinkFrames;

  static Future<VillageGeometry> load() async => VillageGeometry.fromJson(
    jsonDecode(await rootBundle.loadString('assets/v2/village-geometry.json'))
        as Map<String, dynamic>,
  );

  factory VillageGeometry.fromJson(Map<String, dynamic> j) {
    double n(dynamic v) => (v as num).toDouble();
    final sprites = (j['sprites'] as Map<String, dynamic>).map(
      (k, v) => MapEntry(k, SpriteGeometry.fromJson(v as Map<String, dynamic>)),
    );
    final houses = (j['houses'] as Map<String, dynamic>).map((k, v) {
      final m = v as Map<String, dynamic>;
      return MapEntry(k, (
        a: m['a'] as String,
        b: m['b'] as String,
        ko: (m['label'] as Map)['ko'] as String,
        en: (m['label'] as Map)['en'] as String,
      ));
    });
    FacilityDef fac(String id, Map f) => FacilityDef(
      id: id,
      sprite: f['sprite'] as String,
      i: n(f['at'][0]),
      j: n(f['at'][1]),
      tiles: n(f['tiles']),
    );
    final lots = [
      for (final l in j['lots'] as List)
        LotDef(
          slot: (l['slot'] as num).toInt(),
          district: (l['district'] as num).toInt(),
          half: (l['half'] as num).toInt(),
          i: n(l['at'][0]),
          j: n(l['at'][1]),
          facing: (l['facing'] as num).toInt(),
        ),
    ]..sort((a, b) => a.slot.compareTo(b.slot));
    final districts = [
      for (final d in j['districts'] as List)
        DistrictDef(
          index: (d['index'] as num).toInt(),
          id: d['id'] as String,
          nameKo: (d['name'] as Map)['ko'] as String,
          nameEn: (d['name'] as Map)['en'] as String,
          i: n(d['at'][0]),
          j: n(d['at'][1]),
          gi: (d['grid'][0] as num).toInt(),
          gj: (d['grid'][1] as num).toInt(),
          facility: d['facility'] == null
              ? null
              : fac('d${d['index']}', d['facility'] as Map),
          decor: [
            for (final (k, x) in (d['decor'] as List).indexed)
              fac('d${d['index']}-decor$k', x as Map),
          ],
        ),
    ];
    final plaza = [
      for (final f in j['plaza'] as List) fac(f['id'] as String, f as Map),
    ];
    final p = j['parts'] as Map;
    return VillageGeometry._(
      sprites,
      houses,
      lots,
      districts,
      plaza,
      n(j['plotTiles']),
      (
        fence: p['fence'] as String,
        post: p['post'] as String,
        gate: p['gate'] as String,
      ),
      assetOf(j['snowTexture'] as String),
      (j['auroraMinHouses'] as num).toInt(),
      [
        for (final f in (j['rinkFrames'] as List?) ?? const [])
          assetOf(f as String),
      ],
    );
  }

  /// View + mirroring for a door direction (0 = A, 1 = A mirrored, 2 = B, 3 = B mirrored).
  ({String sprite, bool mirror}) houseView(HouseStyle style, int direction) {
    final h = houses[style.name] ?? houses['wood']!;
    return (
      sprite: direction < 2 ? h.a : h.b,
      mirror: direction == 1 || direction == 3,
    );
  }

  String houseLabel(HouseStyle style, {bool ko = true}) => ko
      ? (houses[style.name]?.ko ?? style.name)
      : (houses[style.name]?.en ?? style.name);

  /// Where a sprite is drawn so that its measured base lands on ground (i, j), [tiles] wide.
  Rect placeSprite(String sprite, double i, double j, [double tiles = 1]) {
    final g = sprites[sprite]!;
    final ground = project(i, j);
    final w = tile * tiles / g.tileWidth;
    final h = w * g.aspect;
    return Rect.fromLTWH(
      ground.dx - g.anchor.dx * w,
      ground.dy - g.anchor.dy * h,
      w,
      h,
    );
  }

  /// Tap polygon (sprite hull) in world coords; mirrored sprites flip around the anchor.
  List<Offset> spriteHull(
    String sprite,
    double i,
    double j, [
    double tiles = 1,
    bool mirror = false,
  ]) {
    final g = sprites[sprite]!;
    final r = placeSprite(sprite, i, j, tiles);
    final ax = r.left + g.anchor.dx * r.width;
    return [
      for (final p in g.hull)
        Offset(
          mirror ? 2 * ax - (r.left + p.dx * r.width) : r.left + p.dx * r.width,
          r.top + p.dy * r.height,
        ),
    ];
  }

  List<LotDef> visibleLots(int openHalves) => [
    for (final l in lots)
      if (isHalfOpen(openHalves, l.slot)) l,
  ];

  List<FacilityDef> facilitiesFor(int openHalves) => [
    ...plaza,
    for (final d in districts)
      if (districtState(openHalves, d.index) > 0) ...[
        if (d.facility != null) d.facility!,
        ...d.decor.where((x) => sprites.containsKey(x.sprite)),
      ],
  ];

  List<(int, int)> openCells(int openHalves) => [
    (0, 0),
    for (final d in districts)
      if (districtState(openHalves, d.index) > 0) (d.gi, d.gj),
  ];

  List<Offset> cellDiamond((int, int) c, [double grow = 0]) =>
      tileDiamond(c.$1 * plotTiles, c.$2 * plotTiles, plotTiles + grow);

  ({List<Edge> outer, List<Edge> inner}) groundEdges(int openHalves) {
    final cells = openCells(openHalves);
    final has = cells.toSet();
    final h = plotTiles / 2;
    final outer = <Edge>[];
    final inner = <Edge>[];
    for (final (gi, gj) in cells) {
      final ci = gi * plotTiles;
      final cj = gj * plotTiles;
      final sides = [
        (
          (gi + 1, gj),
          Edge(Offset(ci + h, cj - h), Offset(ci + h, cj + h), false, true),
        ),
        (
          (gi, gj + 1),
          Edge(Offset(ci - h, cj + h), Offset(ci + h, cj + h), true, true),
        ),
        (
          (gi - 1, gj),
          Edge(Offset(ci - h, cj - h), Offset(ci - h, cj + h), false, false),
        ),
        (
          (gi, gj - 1),
          Edge(Offset(ci - h, cj - h), Offset(ci + h, cj - h), true, false),
        ),
      ];
      for (final (nb, e) in sides) {
        if (!has.contains(nb)) {
          outer.add(e);
        } else if (e.front) {
          inner.add(e);
        }
      }
    }
    return (outer: outer, inner: inner);
  }

  List<FencePiece> fencePieces(int openHalves) {
    final outer = groundEdges(openHalves).outer;
    final pieces = <FencePiece>[];
    final posts = <String, Offset>{};
    final g0 = districts[0];
    final gateMid = Offset(
      g0.gi * plotTiles + plotTiles / 2,
      g0.gj * plotTiles,
    );
    for (final e in outer) {
      posts['${e.a}'] = e.a;
      posts['${e.b}'] = e.b;
      final len = (e.b - e.a).distance;
      final isGate =
          e.front &&
          !e.axisI &&
          (e.a.dx - gateMid.dx).abs() < 0.01 &&
          e.a.dy < gateMid.dy &&
          e.b.dy > gateMid.dy;
      var count = math.max(1, (len / segTiles).round());
      if (isGate && count.isEven) count += 1;
      for (var k = 0; k < count; k++) {
        final t = (k + 0.5) / count;
        final at = Offset.lerp(e.a, e.b, t)!;
        final middle = isGate && k == (count - 1) ~/ 2;
        pieces.add(
          FencePiece(
            middle ? 'gate' : 'fence',
            at.dx,
            at.dy,
            !e.axisI,
            at.dx + at.dy,
          ),
        );
      }
    }
    for (final at in posts.values) {
      pieces.add(FencePiece('post', at.dx, at.dy, false, at.dx + at.dy + 0.01));
    }
    return pieces;
  }

  /// Painter's order: back → front by ground depth (i + j).
  List<MapEntity> mapOrder(Village village) {
    final taken = {for (final h in village.houses) h.slot};
    final items = <MapEntity>[
      for (final l in visibleLots(village.openHalves))
        taken.contains(l.slot) ? HouseEntity(l) : LotEntity(l),
      for (final f in facilitiesFor(village.openHalves)) FacilityEntity(f),
      if (sprites.containsKey(parts.fence))
        for (final p in fencePieces(village.openHalves)) FenceEntity(p),
    ]..sort((a, b) => a.depth.compareTo(b.depth));
    return items;
  }

  Rect _bounds(
    Iterable<Offset> pts,
    double padX,
    double padTop,
    double padBottom,
  ) {
    final xs = pts.map((p) => p.dx);
    final ys = pts.map((p) => p.dy);
    return Rect.fromLTRB(
      xs.reduce(math.min) - padX,
      ys.reduce(math.min) - padTop,
      xs.reduce(math.max) + padX,
      ys.reduce(math.max) + padBottom,
    );
  }

  /// Camera framing the plaza and every opened district.
  Rect lotsView(int openHalves) => _bounds(
    [for (final c in openCells(openHalves)) ...cellDiamond(c)],
    tile * 0.3,
    tile * houseTiles * 0.9,
    tile * 0.6,
  );

  /// Every possible district (zoom-out limit).
  Rect fullView() => _bounds(
    [for (final d in districts) ...tileDiamond(d.i, d.j, plotTiles)],
    tile * 0.3,
    tile * houseTiles * 0.9,
    tile * 0.6,
  );

  /// Front-most lot whose shape contains [p] (world coords), or null.
  int? slotAt(Village village, Offset p) {
    final lots = [...visibleLots(village.openHalves)]
      ..sort((a, b) => b.depth.compareTo(a.depth));
    for (final l in lots) {
      final h = village.houseAt(l.slot);
      final shape = h != null
          ? spriteHull(
              houseView(h.style, h.direction).sprite,
              l.i,
              l.j,
              houseTiles,
              houseView(h.style, h.direction).mirror,
            )
          : tileDiamond(l.i, l.j, houseTiles * 0.9);
      if (pointInPolygon(p, shape)) return l.slot;
    }
    return null;
  }

  /// Closed district (or a district's closed second half) under [p], or null.
  int? districtAt(Village village, Offset p) {
    for (final l in lots) {
      if (l.half == 1 &&
          districtState(village.openHalves, l.district) == 1 &&
          pointInPolygon(p, tileDiamond(l.i, l.j, houseTiles * 0.9))) {
        return l.district;
      }
    }
    for (final d in districts) {
      if (districtState(village.openHalves, d.index) == 0 &&
          pointInPolygon(p, tileDiamond(d.i, d.j, plotTiles))) {
        return d.index;
      }
    }
    return null;
  }
}

bool pointInPolygon(Offset p, List<Offset> poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    final a = poly[i];
    final b = poly[j];
    if ((a.dy > p.dy) != (b.dy > p.dy) &&
        p.dx < (b.dx - a.dx) * (p.dy - a.dy) / (b.dy - a.dy) + a.dx) {
      inside = !inside;
    }
  }
  return inside;
}
