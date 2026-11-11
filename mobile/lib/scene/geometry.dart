/// Village map geometry (layout v5) — port of the web's src/lib/map.ts, driven by the same
/// village-geometry.json written by scripts/build_village.py (copied to assets/v2/).
///
/// The cathedral plaza sits on a small rise in the middle; districts are round clearings in a snowy fir
/// forest around it, each with its landmark in the centre and 6 houses around it. The opened village is
/// drawn as ONE rounded shape (no islands, no bridges); trees inside it disappear.
///
/// World units: one ground tile is [tile] wide on screen. Ground point (i, j) at elevation z projects to
///   x = (i - j) * tile / 2,  y = (i + j) * tile / 4 - z * elevationPx     (2:1 isometric, plaza at 0,0)
library;

import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/services.dart' show rootBundle;

import '../data/models.dart';

const double tile = 100;

/// On-screen house size in tiles (same as the web).
const double houseTiles = 1.7;

/// Screen px per elevation unit; set from the geometry JSON on load.
double elevationPx = 40;

String assetOf(String src) => src.replaceFirst('/assets/', 'assets/');

class SpriteGeometry {
  SpriteGeometry({
    required this.asset,
    required this.anchor,
    required this.tileWidth,
    required this.bbox,
    required this.hull,
    required this.aspect,
  });
  final String asset;
  final Offset anchor; // normalised
  final double tileWidth; // normalised
  final List<double> bbox; // normalised x0, y0, x1, y1
  final List<Offset> hull; // normalised
  final double aspect; // canvas height / width

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
  );
}

Offset project(double i, double j, [double z = 0]) =>
    Offset((i - j) * tile / 2, (i + j) * tile / 4 - z * elevationPx);

/// Diamond outline of a ground tile (footprint) centred on (i, j), [size] tiles wide.
List<Offset> tileDiamond(double i, double j, [double size = 1, double z = 0]) {
  final h = size / 2;
  return [
    project(i - h, j - h, z),
    project(i + h, j - h, z),
    project(i + h, j + h, z),
    project(i - h, j + h, z),
  ];
}

class LotDef {
  const LotDef({
    required this.slot,
    required this.district,
    required this.half,
    required this.i,
    required this.j,
    required this.z,
    required this.facing,
  });
  final int slot;
  final int district;
  final int half;
  final double i;
  final double j;
  final double z;
  final int facing;
  double get depth => i + j;
}

class FacilityDef {
  const FacilityDef({
    required this.id,
    required this.sprite,
    required this.i,
    required this.j,
    required this.z,
    required this.tiles,
  });
  final String id;
  final String sprite;
  final double i;
  final double j;
  final double z;
  final double tiles;
  double get depth => i + j;
}

class TreeDef {
  const TreeDef(this.sprite, this.i, this.j, this.z, this.tiles, this.mirror);
  final String sprite;
  final double i;
  final double j;
  final double z;
  final double tiles;
  final bool mirror;
  double get depth => i + j;
}

/// A raised piece of ground: the plaza mound or a district clearing.
class AreaDef {
  const AreaDef({
    required this.i,
    required this.j,
    required this.z,
    required this.outline,
  });
  final double i;
  final double j;
  final double z;

  /// Irregular round outline on the ground plane (tiles).
  final List<Offset> outline;

  /// Projected outline (screen coords).
  List<Offset> get projected => [
    for (final p in outline) project(p.dx, p.dy, z),
  ];
}

class DistrictDef extends AreaDef {
  const DistrictDef({
    required this.index,
    required this.id,
    required this.nameKo,
    required this.nameEn,
    required super.i,
    required super.j,
    required super.z,
    required super.outline,
    required this.path,
    required this.pond,
    required this.facility,
    required this.decor,
  });
  final int index;
  final String id;
  final String nameKo;
  final String nameEn;

  /// Path centre line from the plaza to the clearing: (i, j, z) points.
  final List<(double, double, double)> path;

  /// Frozen pond outline (lake district), drawn in code.
  final List<Offset>? pond;
  final FacilityDef? facility;
  final List<FacilityDef> decor;
}

sealed class MapEntity {
  const MapEntity();
  double get depth;
  double get x;
}

class HouseEntity extends MapEntity {
  const HouseEntity(this.lot);
  final LotDef lot;
  @override
  double get depth => lot.depth;
  @override
  double get x => lot.i - lot.j;
}

class LotEntity extends MapEntity {
  const LotEntity(this.lot);
  final LotDef lot;
  @override
  double get depth => lot.depth;
  @override
  double get x => lot.i - lot.j;
}

class FacilityEntity extends MapEntity {
  const FacilityEntity(this.facility);
  final FacilityDef facility;
  @override
  double get depth => facility.depth;
  @override
  double get x => facility.i - facility.j;
}

class TreeEntity extends MapEntity {
  const TreeEntity(this.tree);
  final TreeDef tree;
  @override
  double get depth => tree.depth;
  @override
  double get x => tree.i - tree.j;
}

class VillageGeometry {
  VillageGeometry._(
    this.sprites,
    this.houses,
    this.lots,
    this.districts,
    this.plaza,
    this.plazaArea,
    this.forest,
    this.pathWidth,
    this.districtRadius,
    this.plazaBaseRadius,
    this.hullMargin,
    this.snowTexture,
    this.auroraMinHouses,
    this.rinkFrames,
  );

  final Map<String, SpriteGeometry> sprites;
  final Map<String, ({String a, String b, String ko, String en})> houses;
  final List<LotDef> lots;
  final List<DistrictDef> districts;
  final List<FacilityDef> plaza;
  final AreaDef plazaArea;
  final List<TreeDef> forest;
  final double pathWidth;
  final double districtRadius;
  final double plazaBaseRadius;
  final double hullMargin;
  final String snowTexture;
  final int auroraMinHouses;
  final List<String> rinkFrames;

  static Future<VillageGeometry> load() async => VillageGeometry.fromJson(
    jsonDecode(await rootBundle.loadString('assets/v2/village-geometry.json'))
        as Map<String, dynamic>,
  );

  factory VillageGeometry.fromJson(Map<String, dynamic> j) {
    double n(dynamic v) => (v as num).toDouble();
    elevationPx = n(j['elevationPx']);
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
    List<Offset> ring(List raw) => [
      for (final p in raw) Offset(n(p[0]), n(p[1])),
    ];
    FacilityDef fac(String id, Map f) => FacilityDef(
      id: id,
      sprite: f['sprite'] as String,
      i: n(f['at'][0]),
      j: n(f['at'][1]),
      z: n(f['z'] ?? 0),
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
          z: n(l['z'] ?? 0),
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
          z: n(d['z']),
          outline: ring(d['outline'] as List),
          path: [
            for (final p in d['path'] as List) (n(p[0]), n(p[1]), n(p[2])),
          ],
          pond: d['pond'] == null ? null : ring(d['pond'] as List),
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
    final pa = j['plazaArea'] as Map;
    final forest = [
      for (final t in j['forest'] as List)
        TreeDef(
          t['sprite'] as String,
          n(t['at'][0]),
          n(t['at'][1]),
          n(t['z'] ?? 0),
          n(t['tiles']),
          t['mirror'] == true,
        ),
    ];
    return VillageGeometry._(
      sprites,
      houses,
      lots,
      districts,
      plaza,
      AreaDef(
        i: n(pa['at'][0]),
        j: n(pa['at'][1]),
        z: n(pa['z']),
        outline: ring(pa['outline'] as List),
      ),
      forest,
      n(j['pathWidth']),
      n(j['districtRadius']),
      n(j['plazaBaseRadius']),
      n(j['hullMargin']),
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

  /// Where a sprite is drawn so that its measured base lands on ground (i, j, z), [tiles] wide.
  Rect placeSprite(
    String sprite,
    double i,
    double j, [
    double tiles = 1,
    double z = 0,
  ]) {
    final g = sprites[sprite]!;
    final ground = project(i, j, z);
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
    double z = 0,
  ]) {
    final g = sprites[sprite]!;
    final r = placeSprite(sprite, i, j, tiles, z);
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

  List<DistrictDef> openDistricts(int openHalves) => [
    for (final d in districts)
      if (districtState(openHalves, d.index) > 0) d,
  ];

  List<FacilityDef> facilitiesFor(int openHalves) => [
    ...plaza,
    for (final d in openDistricts(openHalves)) ...[
      if (d.facility != null) d.facility!,
      ...d.decor.where((x) => sprites.containsKey(x.sprite)),
    ],
  ];

  /// The opened village as ONE rounded shape on the ground plane: a convex envelope of the plaza base and
  /// every opened clearing, resampled with a gently wavy edge (same numbers as the web).
  List<Offset> villageShape(int openHalves) {
    final circles = <(double, double, double)>[(0, 0, plazaBaseRadius)];
    for (final d in openDistricts(openHalves)) {
      circles.add((d.i, d.j, districtRadius + hullMargin));
    }
    final pts = <Offset>[
      for (final (ci, cj, r) in circles)
        for (var k = 0; k < 48; k++)
          Offset(
            ci + r * math.cos(k * math.pi / 24),
            cj + r * math.sin(k * math.pi / 24),
          ),
    ];
    final hull = convexHull(pts);
    final out = <Offset>[];
    var s = 0.0;
    for (var k = 0; k < hull.length; k++) {
      final a = hull[k];
      final b = hull[(k + 1) % hull.length];
      final l = (b - a).distance;
      final n = math.max(1, (l / 0.6).round());
      final ni = (b.dy - a.dy) / (l == 0 ? 1 : l);
      final nj = -(b.dx - a.dx) / (l == 0 ? 1 : l);
      for (var t = 0; t < n; t++) {
        final f = t / n;
        final w =
            0.22 * math.sin(s * 0.55 + 0.7) + 0.12 * math.sin(s * 1.37 + 2.1);
        out.add(
          Offset(
            a.dx + (b.dx - a.dx) * f + ni * w,
            a.dy + (b.dy - a.dy) * f + nj * w,
          ),
        );
        s += l / n;
      }
    }
    return out;
  }

  /// Trees still standing: outside the village shape, with a little room at the sides and more in front
  /// of it (the viewer looks along +i+j, so trees just in front would hide houses).
  List<TreeDef> forestFor(int openHalves, [List<Offset>? shape]) {
    final s = shape ?? villageShape(openHalves);
    bool near(double i, double j) => pointInPolygon(Offset(i, j), s);
    return [
      for (final t in forest)
        if (!(near(t.i, t.j) ||
            near(t.i - 0.6, t.j) ||
            near(t.i, t.j - 0.6) ||
            near(t.i + 0.6, t.j) ||
            near(t.i, t.j + 0.6) ||
            near(t.i - 1.4, t.j - 1.4) ||
            near(t.i - 2.4, t.j - 2.4)))
          t,
    ];
  }

  /// Painter's order: back → front by ground depth (i + j), ties by x.
  List<MapEntity> mapOrder(Village village, [List<Offset>? shape]) {
    final open = village.openHalves;
    final taken = {for (final h in village.houses) h.slot};
    return <MapEntity>[
      for (final l in visibleLots(open))
        taken.contains(l.slot) ? HouseEntity(l) : LotEntity(l),
      for (final f in facilitiesFor(open)) FacilityEntity(f),
      for (final t in forestFor(open, shape)) TreeEntity(t),
    ]..sort((a, b) {
      final c = a.depth.compareTo(b.depth);
      return c != 0 ? c : a.x.compareTo(b.x);
    });
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

  /// Camera framing the plaza and every opened district, with room for roofs and name chips.
  Rect lotsView(int openHalves) => _bounds(
    [
      for (final p in villageShape(openHalves)) project(p.dx, p.dy),
      ...plazaArea.projected,
    ],
    tile * 0.4,
    tile * houseTiles * 1.1,
    tile * 0.7,
  );

  /// Every possible district (zoom-out limit).
  Rect fullView() => _bounds(
    [...plazaArea.projected, for (final d in districts) ...d.projected],
    tile * 1.2,
    tile * houseTiles * 1.1,
    tile * 1.2,
  );

  /// Outer edge of the land (forest), projected.
  List<Offset> landOutline() {
    const r = 33.0;
    return [
      for (var k = 0; k < 48; k++)
        project(
          r * math.cos(2 * math.pi * k / 48),
          r * math.sin(2 * math.pi * k / 48),
        ),
    ];
  }

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
              l.z,
            )
          : tileDiamond(l.i, l.j, houseTiles * 0.9, l.z);
      if (pointInPolygon(p, shape)) return l.slot;
    }
    return null;
  }

  /// Closed district (or a district's closed second half) under [p], or null.
  int? districtAt(Village village, Offset p) {
    for (final l in lots) {
      if (l.half == 1 &&
          districtState(village.openHalves, l.district) == 1 &&
          pointInPolygon(p, tileDiamond(l.i, l.j, houseTiles * 0.9, l.z))) {
        return l.district;
      }
    }
    for (final d in districts) {
      if (districtState(village.openHalves, d.index) == 0 &&
          pointInPolygon(p, d.projected)) {
        return d.index;
      }
    }
    return null;
  }
}

List<Offset> convexHull(List<Offset> points) {
  final p = [...points]
    ..sort((a, b) {
      final c = a.dx.compareTo(b.dx);
      return c != 0 ? c : a.dy.compareTo(b.dy);
    });
  double cross(Offset o, Offset a, Offset b) =>
      (a.dx - o.dx) * (b.dy - o.dy) - (a.dy - o.dy) * (b.dx - o.dx);
  final lower = <Offset>[];
  for (final q in p) {
    while (lower.length >= 2 &&
        cross(lower[lower.length - 2], lower.last, q) <= 0) {
      lower.removeLast();
    }
    lower.add(q);
  }
  final upper = <Offset>[];
  for (final q in p.reversed) {
    while (upper.length >= 2 &&
        cross(upper[upper.length - 2], upper.last, q) <= 0) {
      upper.removeLast();
    }
    upper.add(q);
  }
  return [
    ...lower.sublist(0, lower.length - 1),
    ...upper.sublist(0, upper.length - 1),
  ];
}

/// A path's band ([width] tiles) as one projected polygon.
List<Offset> pathPolygon(List<(double, double, double)> line, double width) {
  final left = <Offset>[];
  final right = <Offset>[];
  final w = width / 2;
  for (var k = 0; k < line.length; k++) {
    final (i, j, z) = line[k];
    final a = line[math.max(0, k - 1)];
    final b = line[math.min(line.length - 1, k + 1)];
    var l = math.sqrt(math.pow(b.$1 - a.$1, 2) + math.pow(b.$2 - a.$2, 2));
    if (l == 0) l = 1;
    final ni = -(b.$2 - a.$2) / l * w;
    final nj = (b.$1 - a.$1) / l * w;
    left.add(project(i + ni, j + nj, z));
    right.add(project(i - ni, j - nj, z));
  }
  return [...left, ...right.reversed];
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
