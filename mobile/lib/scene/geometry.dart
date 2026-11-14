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
  const TreeDef(
    this.sprite,
    this.i,
    this.j,
    this.z,
    this.tiles,
    this.mirror, {
    this.plaza = false,
  });
  final String sprite;
  final double i;
  final double j;
  final double z;
  final double tiles;
  final bool mirror;

  /// Stands where the plaza will be: shown only while the plaza is not there yet (the free village).
  final bool plaza;
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
    required this.names,
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

  /// Name per language code (ko, en, ja, zh, es, fr, de, pt, ru, id).
  final Map<String, String> names;

  String name(String lang) => names[lang] ?? names['en'] ?? id;

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
  final Map<String, ({String a, String b, Map<String, String> labels})> houses;
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
        labels: (m['label'] as Map).cast<String, String>(),
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
          names: (d['name'] as Map).cast<String, String>(),
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
          plaza: t['plaza'] == true,
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

  String houseLabel(HouseStyle style, String lang) {
    final l = houses[style.name]?.labels;
    return l?[lang] ?? l?['en'] ?? style.name;
  }

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

  /// Plaza facilities plus, for every opened district, its facility and decoration. Decorations the
  /// owner moved ([decor]) stand at their new spot. Mirrors `facilitiesFor` in map.ts.
  List<FacilityDef> facilitiesFor(
    int openHalves, [
    Map<String, Offset> decor = const {},
  ]) => [
    for (final f in [
      if (plazaShown(openHalves)) ...plaza,
      for (final d in openDistricts(openHalves)) ...[
        if (d.facility != null) d.facility!,
        ...d.decor.where((x) => sprites.containsKey(x.sprite)),
      ],
    ])
      if (decor[f.id] != null && movableDecorId.hasMatch(f.id))
        FacilityDef(
          id: f.id,
          sprite: f.sprite,
          i: decor[f.id]!.dx,
          j: decor[f.id]!.dy,
          z: f.z,
          tiles: f.tiles,
        )
      else
        f,
  ];

  /// Decorations the owner may move (opened districts only), at their current spots.
  List<FacilityDef> movableDecor(
    int openHalves, [
    Map<String, Offset> decor = const {},
  ]) => [
    for (final f in facilitiesFor(openHalves, decor))
      if (movableDecorId.hasMatch(f.id)) f,
  ];

  /// Can decoration [id] stand at [at]? Plaza decorations stay on the plaza mound (clear of the
  /// cathedral and the tree); district decorations stay on the village ground off the mound and its
  /// back slope. Neither may stand on a lot, a path, a landmark, a pond or another decoration.
  /// Mirrors `decorSpotOk` in map.ts.
  bool decorSpotOk(
    int openHalves,
    Map<String, Offset> decor,
    String id,
    Offset at,
  ) {
    if (!movableDecorId.hasMatch(id)) return false;
    final onPlaza = id.startsWith('plaza-');
    if (onPlaza) {
      if (!_insideBy(at, plazaArea.outline, _clearRim + _fenceInset)) {
        return false;
      }
      for (final f in plaza) {
        final r = f.id == 'cathedral'
            ? _clearCathedral
            : f.id == 'tree'
            ? _clearTree
            : null;
        if (r != null && (Offset(f.i, f.j) - at).distance < r) return false;
      }
    } else {
      if (!_insideBy(at, villageShape(openHalves), _clearRim)) return false;
      final di = at.dx - plazaArea.i;
      final dj = at.dy - plazaArea.j;
      var l = math.sqrt(di * di + dj * dj);
      if (l == 0) l = 1;
      final w = _clearRim + slopeWidth(plazaArea, at.dx, at.dy);
      if (pointInPolygon(at, plazaArea.outline) ||
          pointInPolygon(
            Offset(at.dx - di / l * w, at.dy - dj / l * w),
            plazaArea.outline,
          )) {
        return false;
      }
      for (final lot in lots) {
        if (districtState(openHalves, lot.district) == 0) continue;
        if ((Offset(lot.i, lot.j) - at).distance < _clearLot) return false;
      }
    }
    for (final d in openDistricts(openHalves)) {
      if (!onPlaza && _distToLine(at, d.path) < _clearPath) return false;
      final f = d.facility;
      if (f != null &&
          (Offset(d.i, d.j) - at).distance < f.tiles * 0.55 + 0.3) {
        return false;
      }
      final pond = d.pond;
      if (pond != null && _nearPoly(at, pond, 0.35)) return false;
    }
    for (final f in movableDecor(openHalves, decor)) {
      if (f.id != id && (Offset(f.i, f.j) - at).distance < _clearDecor) {
        return false;
      }
    }
    return true;
  }

  /// The opened village as ONE rounded shape on the ground plane: a convex envelope of the plaza base and
  /// every opened clearing, resampled every ~0.6 tiles with a smooth edge (same as the web; owner
  /// 2026-11-14: the old wavy edge looked bumpy).
  List<Offset> villageShape(int openHalves) {
    final circles = <(double, double, double)>[
      if (plazaShown(openHalves)) (0, 0, plazaBaseRadius),
    ];
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
    for (var k = 0; k < hull.length; k++) {
      final a = hull[k];
      final b = hull[(k + 1) % hull.length];
      final n = math.max(1, ((b - a).distance / 0.6).round());
      for (var t = 0; t < n; t++) {
        out.add(Offset.lerp(a, b, t / n)!);
      }
    }
    return out;
  }

  /// Trees still standing: outside the village shape, with a little room at the sides and more in front
  /// of it (the viewer looks along +i+j, so trees just in front would hide houses).
  List<TreeDef> forestFor(int openHalves, [List<Offset>? shape]) {
    final s = shape ?? villageShape(openHalves);
    bool near(double i, double j) => pointInPolygon(Offset(i, j), s);
    final withPlaza = plazaShown(openHalves);
    return [
      for (final t in forest)
        if (!(t.plaza && withPlaza) &&
            !(near(t.i, t.j) ||
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
      for (final f in facilitiesFor(open, village.decor)) FacilityEntity(f),
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
  /// The camera never shows less than this many px of map across (owner 2026-11-14: at 1150 the free village was
  /// too small on a phone; at 820 it fills the width). Same as `MIN_VIEW_WIDTH` in map.ts.
  static const minViewWidth = 820.0;

  /// Land radius (tiles) and its lowest screen y: the default camera never looks past it. Same as map.ts.
  static const landRadius = 33.0;
  static final landBottom = landRadius * math.sqrt2 * tile / 4;

  Rect lotsView(int openHalves) => _bounds(
    [
      for (final p in villageShape(openHalves)) project(p.dx, p.dy),
      if (plazaShown(openHalves)) ...plazaArea.projected,
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
    const r = landRadius;
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

/// One step where a path leaves the plaza mound through its walled side: a box from the ground up to [z].
class PathStep {
  const PathStep(this.corners, this.z);

  /// Top face corners on the ground plane (tiles).
  final List<Offset> corners;
  final double z;
}

/// A ground point with its elevation (tiles, tiles, elevation units).
typedef GZ = (double, double, double);

double _smoothstep(double t) {
  final u = t.clamp(0.0, 1.0);
  return u * u * (3 - 2 * u);
}

const _stepDepth = 0.3;
const _stepCount = 3;
const _stepHalfWidth = 0.62;

/// Back of the plaza mound: the ground rises gently to it over this many tiles (no wall, no fence there).
const _slopeWidth = 1.4;
const _fenceInset = 0.22;
const _fencePitch = 0.62;
const _fenceGap = 0.85;

/// The free village's fence: inset from the base's edge, and half-width of the opening at the front (tiles).
const _villageFenceInset = 0.55;
const _villageGate = 1.1;

/// The free village is district 0 alone, like the first concept: houses around the Christmas tree on a fenced
/// snowy base, no cathedral (owner 2026-11-12). The plaza and the paths appear with the first expansion into
/// another district. Mirrors `plazaShown` in map.ts.
bool plazaShown(int openHalves) => (openHalves & ~3) != 0;

/// How much an outline point faces away from the viewer (1 = straight back).
double _backness(AreaDef a, double i, double j) {
  final di = i - a.i;
  final dj = j - a.j;
  var l = math.sqrt(di * di + dj * dj);
  if (l == 0) l = 1;
  return -(di + dj) / l / math.sqrt2;
}

/// Width (tiles) of the gentle slope behind the mound at an outline point; 0 where it has a wall.
/// Mirrors `slopeWidth` in map.ts.
double slopeWidth(AreaDef a, double i, double j) =>
    _slopeWidth * _smoothstep((_backness(a, i, j) - 0.12) / 0.55);

/// The gentle snowy slope behind the plaza mound: one quad per outline edge (top at a.z, foot on the
/// ground). Mirrors `plazaSlope` in map.ts.
List<List<GZ>> plazaSlope(AreaDef a) {
  final foot = [
    for (final p in a.outline)
      () {
        final w = slopeWidth(a, p.dx, p.dy);
        final di = p.dx - a.i;
        final dj = p.dy - a.j;
        var l = math.sqrt(di * di + dj * dj);
        if (l == 0) l = 1;
        return (p.dx + di / l * w, p.dy + dj / l * w, 0.0);
      }(),
  ];
  final n = a.outline.length;
  final out = <List<GZ>>[];
  for (var k = 0; k < n; k++) {
    final m = (k + 1) % n;
    if (foot[k].$1 == a.outline[k].dx && foot[m].$1 == a.outline[m].dx) {
      continue;
    }
    out.add([
      (a.outline[k].dx, a.outline[k].dy, a.z),
      (a.outline[m].dx, a.outline[m].dy, a.z),
      foot[m],
      foot[k],
    ]);
  }
  return out;
}

/// Where [line] leaves [area]: point, unit direction and distance along the path.
({double i, double j, double ui, double uj, double along})? _pathExit(
  List<(double, double, double)> line,
  AreaDef area,
) {
  var along = 0.0;
  for (var k = 0; k + 1 < line.length; k++) {
    final a = Offset(line[k].$1, line[k].$2);
    final b = Offset(line[k + 1].$1, line[k + 1].$2);
    final l = (b - a).distance;
    if (l > 0 &&
        pointInPolygon(a, area.outline) &&
        !pointInPolygon(b, area.outline)) {
      var lo = 0.0;
      var hi = 1.0;
      for (var n = 0; n < 20; n++) {
        final m = (lo + hi) / 2;
        if (pointInPolygon(a + (b - a) * m, area.outline)) {
          lo = m;
        } else {
          hi = m;
        }
      }
      final p = a + (b - a) * lo;
      return (
        i: p.dx,
        j: p.dy,
        ui: (b.dx - a.dx) / l,
        uj: (b.dy - a.dy) / l,
        along: along + l * lo,
      );
    }
    along += l;
  }
  return null;
}

bool _walledExit(
  ({double i, double j, double ui, double uj, double along}) e,
  AreaDef area,
) => slopeWidth(area, e.i, e.j) < 0.35;

/// Wooden steps down the plaza mound where a path leaves it through the walled side.
/// Mirrors `pathSteps` in map.ts.
List<PathStep> pathSteps(List<(double, double, double)> line, AreaDef area) {
  final e = _pathExit(line, area);
  if (e == null || !_walledExit(e, area)) return const [];
  final ni = -e.uj;
  final nj = e.ui;
  Offset at(double t, double s) =>
      Offset(e.i + e.ui * t + ni * s, e.j + e.uj * t + nj * s);
  return [
    for (var k = 0; k < _stepCount; k++)
      PathStep([
        at(k * _stepDepth - 0.08, -_stepHalfWidth),
        at((k + 1) * _stepDepth - 0.08, -_stepHalfWidth),
        at((k + 1) * _stepDepth - 0.08, _stepHalfWidth),
        at(k * _stepDepth - 0.08, _stepHalfWidth),
      ], area.z * (1 - (k + 1) / (_stepCount + 1))),
  ];
}

/// The dirt path from the plaza mound's edge to its clearing: its two edges, sampled every 0.12 tiles.
/// Off a walled edge it starts at the foot of the steps; down the back slope its elevation eases from the
/// mound to the ground. Mirrors `pathBand` in map.ts.
({List<GZ> left, List<GZ> right}) pathBand(
  List<(double, double, double)> line,
  AreaDef area,
  double width,
) {
  final e = _pathExit(line, area);
  final walled = e != null && _walledExit(e, area);
  final start = e == null ? 0.0 : e.along + (walled ? 0.12 : 0);
  final slope = e != null && !walled
      ? math.max(0.6, slopeWidth(area, e.i, e.j))
      : 0.0;
  final groundZ = line.last.$3;
  final w = width / 2;
  final left = <GZ>[];
  final right = <GZ>[];
  var along = 0.0;
  const step = 0.12;
  for (var k = 0; k + 1 < line.length; k++) {
    final (ai, aj, az) = line[k];
    final (bi, bj, _) = line[k + 1];
    final l = math.sqrt((bi - ai) * (bi - ai) + (bj - aj) * (bj - aj));
    if (l == 0) continue;
    final ui = (bi - ai) / l;
    final uj = (bj - aj) / l;
    final last = k + 2 == line.length;
    for (var t = 0.0; t < l + (last ? 1e-6 : 0); t += step) {
      final d = along + t;
      if (d < start) continue;
      final ci = ai + ui * t;
      final cj = aj + uj * t;
      final z = e != null && !walled
          ? area.z + (groundZ - area.z) * _smoothstep((d - e.along) / slope)
          : e != null
          ? groundZ
          : az;
      final ww = w * (0.85 + 0.15 * _smoothstep((d - start) / 0.4));
      left.add((ci - uj * ww, cj + ui * ww, z));
      right.add((ci + uj * ww, cj - ui * ww, z));
    }
    along += l;
  }
  return (left: left, right: right);
}

/// Fence runs along the walled (front and side) edge of the plaza mound, just inside it, broken where an
/// opened path leaves. The back slope has no fence. Mirrors `plazaFence` in map.ts.
List<List<Offset>> plazaFence(
  List<List<(double, double, double)>> paths,
  AreaDef area,
) {
  final exits = [for (final p in paths) _pathExit(p, area)]
      .whereType<({double i, double j, double ui, double uj, double along})>()
      .toList();
  final ring = [
    for (final p in area.outline)
      () {
        final di = p.dx - area.i;
        final dj = p.dy - area.j;
        var l = math.sqrt(di * di + dj * dj);
        if (l == 0) l = 1;
        return Offset(p.dx - di / l * _fenceInset, p.dy - dj / l * _fenceInset);
      }(),
  ];
  var total = 0.0;
  for (var k = 0; k < ring.length; k++) {
    total += (ring[(k + 1) % ring.length] - ring[k]).distance;
  }
  final count = (total / _fencePitch).round();
  final pitch = total / count;
  final posts = <Offset?>[];
  var seg = 0;
  var segStart = 0.0;
  for (var n = 0; n < count; n++) {
    final d = n * pitch;
    while (true) {
      final a = ring[seg];
      final b = ring[(seg + 1) % ring.length];
      final l = (b - a).distance;
      if (d <= segStart + l || seg == ring.length - 1) {
        final t = l > 0 ? (d - segStart) / l : 0.0;
        final p = a + (b - a) * t;
        final walled = slopeWidth(area, p.dx, p.dy) < 0.3;
        final inGap = exits.any(
          (x) => (Offset(x.i, x.j) - p).distance < _fenceGap,
        );
        posts.add(walled && !inGap ? p : null);
        break;
      }
      segStart += l;
      seg++;
    }
  }
  final firstGap = posts.indexWhere((p) => p == null);
  if (firstGap < 0) return [posts.cast<Offset>()];
  final runs = <List<Offset>>[];
  var cur = <Offset>[];
  for (var k = 1; k <= posts.length; k++) {
    final p = posts[(firstGap + k) % posts.length];
    if (p != null) {
      cur.add(p);
    } else if (cur.isNotEmpty) {
      runs.add(cur);
      cur = <Offset>[];
    }
  }
  if (cur.isNotEmpty) runs.add(cur);
  return runs.where((r) => r.length >= 2).toList();
}

/// The free village's fence (first concept: a fenced snowy base): posts all around, just inside the base's edge,
/// with an opening at the front. Mirrors `villageFence` in map.ts.
List<List<Offset>> villageFence(List<Offset> shape) {
  var ci = 0.0;
  var cj = 0.0;
  for (final p in shape) {
    ci += p.dx;
    cj += p.dy;
  }
  ci /= shape.length;
  cj /= shape.length;
  var front = shape.first;
  for (final p in shape) {
    if (p.dx + p.dy > front.dx + front.dy) front = p;
  }
  final ring = [
    for (final p in shape)
      () {
        var l = math.sqrt(math.pow(p.dx - ci, 2) + math.pow(p.dy - cj, 2));
        if (l == 0) l = 1;
        return Offset(
          p.dx - (p.dx - ci) / l * _villageFenceInset,
          p.dy - (p.dy - cj) / l * _villageFenceInset,
        );
      }(),
  ];
  var total = 0.0;
  for (var k = 0; k < ring.length; k++) {
    total += (ring[(k + 1) % ring.length] - ring[k]).distance;
  }
  final count = (total / _fencePitch).round();
  final pitch = total / count;
  final posts = <Offset?>[];
  var seg = 0;
  var segStart = 0.0;
  for (var n = 0; n < count; n++) {
    final d = n * pitch;
    while (seg < ring.length - 1) {
      final l = (ring[seg + 1] - ring[seg]).distance;
      if (d <= segStart + l) break;
      segStart += l;
      seg++;
    }
    final a = ring[seg];
    final b = ring[(seg + 1) % ring.length];
    final l = (b - a).distance;
    final t = l > 0 ? math.min(1.0, (d - segStart) / l) : 0.0;
    final p = a + (b - a) * t;
    posts.add((p - front).distance < _villageGate ? null : p);
  }
  return _fenceRuns(posts);
}

/// Split a closed ring of fence posts (null = gap) into runs; a run may wrap past post 0.
List<List<Offset>> _fenceRuns(List<Offset?> posts) {
  final firstGap = posts.indexWhere((p) => p == null);
  if (firstGap < 0) return [posts.cast<Offset>()];
  final runs = <List<Offset>>[];
  var cur = <Offset>[];
  for (var k = 1; k <= posts.length; k++) {
    final p = posts[(firstGap + k) % posts.length];
    if (p != null) {
      cur.add(p);
    } else if (cur.isNotEmpty) {
      runs.add(cur);
      cur = <Offset>[];
    }
  }
  if (cur.isNotEmpty) runs.add(cur);
  return runs.where((r) => r.length >= 2).toList();
}

// Clearances (tiles) for a moved decoration; same as DECOR_CLEAR in map.ts.
const _clearLot = 1.2;
const _clearPath = 0.6;
const _clearDecor = 0.45;
const _clearRim = 0.4;
const _clearCathedral = 1.5;
const _clearTree = 0.75;

/// Screen point (world units) → ground tile at elevation [z] (inverse of [project]).
Offset groundAt(Offset p, [double z = 0]) {
  final a = p.dx / (tile / 2);
  final b = (p.dy + z * elevationPx) / (tile / 4);
  return Offset((a + b) / 2, (b - a) / 2);
}

double _distToLine(Offset p, List<(double, double, double)> line) {
  var best = double.infinity;
  for (var k = 0; k + 1 < line.length; k++) {
    final (ai, aj, _) = line[k];
    final (bi, bj, _) = line[k + 1];
    final vi = bi - ai;
    final vj = bj - aj;
    var l2 = vi * vi + vj * vj;
    if (l2 == 0) l2 = 1;
    final t = (((p.dx - ai) * vi + (p.dy - aj) * vj) / l2).clamp(0.0, 1.0);
    best = math.min(best, (p - Offset(ai + t * vi, aj + t * vj)).distance);
  }
  return best;
}

/// Inside [poly] with at least [margin] tiles to spare in every direction.
bool _insideBy(Offset p, List<Offset> poly, double margin) {
  if (!pointInPolygon(p, poly)) return false;
  for (var k = 0; k < 8; k++) {
    final a = k * math.pi / 4;
    if (!pointInPolygon(
      p + Offset(math.cos(a) * margin, math.sin(a) * margin),
      poly,
    )) {
      return false;
    }
  }
  return true;
}

/// Inside [poly], or within [margin] tiles of it.
bool _nearPoly(Offset p, List<Offset> poly, double margin) {
  if (pointInPolygon(p, poly)) return true;
  for (var k = 0; k < 8; k++) {
    final a = k * math.pi / 4;
    if (pointInPolygon(
      p + Offset(math.cos(a) * margin, math.sin(a) * margin),
      poly,
    )) {
      return true;
    }
  }
  return false;
}
