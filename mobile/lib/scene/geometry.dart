/// Scene geometry — port of the web's src/lib/scene.ts, driven by the same
/// asset-geometry.json produced by scripts/build_assets.py.
library;

import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/services.dart' show rootBundle;

import '../data/models.dart';

const double worldSize = 1024;
const String artRoot = 'assets/art';

class SpriteGeometry {
  SpriteGeometry({required this.asset, required this.anchor, required this.tileWidth, required this.hull});
  final String asset;
  final Offset anchor; // normalised
  final double tileWidth; // normalised
  final List<Offset> hull; // normalised

  factory SpriteGeometry.fromJson(Map<String, dynamic> j) => SpriteGeometry(
        asset: '$artRoot${(j['src'] as String).replaceFirst('/assets', '')}',
        anchor: Offset((j['anchor'][0] as num).toDouble(), (j['anchor'][1] as num).toDouble()),
        tileWidth: (j['tileWidth'] as num).toDouble(),
        hull: (j['hull'] as List).map((p) => Offset((p[0] as num).toDouble(), (p[1] as num).toDouble())).toList(),
      );

  /// Where the sprite is drawn so that its tile anchor lands on [ground].
  Rect rectAt(Offset ground, double tileWorld) {
    final size = tileWorld / tileWidth;
    return Rect.fromLTWH(ground.dx - anchor.dx * size, ground.dy - anchor.dy * size, size, size);
  }
}

class SlotDef {
  SlotDef({required this.slot, required this.position, required this.anchor, required this.hitPolygon})
      : hit = _bounds(hitPolygon);
  final int slot;
  final String position;
  final Offset anchor;
  final List<Offset> hitPolygon;
  final Rect hit;

  static Rect _bounds(List<Offset> p) {
    final xs = p.map((o) => o.dx);
    final ys = p.map((o) => o.dy);
    return Rect.fromLTRB(xs.reduce(math.min), ys.reduce(math.min), xs.reduce(math.max), ys.reduce(math.max));
  }
}

sealed class SceneEntity {
  const SceneEntity(this.depth);
  final double depth;
}

class HouseEntity extends SceneEntity {
  const HouseEntity(this.slot, super.depth);
  final int slot;
}

class TreeEntity extends SceneEntity {
  const TreeEntity(super.depth);
}

/// Free decoration unlocked by house count (4 → sled, 6 → snowman family).
class PropDef {
  const PropDef({required this.sprite, required this.ground, required this.tile, required this.minHouses});
  final String sprite;
  final Offset ground;
  final double tile;
  final int minHouses;
}

class PropEntity extends SceneEntity {
  const PropEntity(this.prop, super.depth);
  final PropDef prop;
}

class BackgroundLayers {
  const BackgroundLayers(this.back, this.front);
  final String back;

  /// Front fences, lamps, snowman — drawn over houses and props.
  final String front;
}

class SceneGeometry {
  SceneGeometry._(this.sprites, this.backgrounds, this.slots, this.treeAnchor, this.tileWorld, this.treeTileWorld, this.props, this.auroraMinHouses);

  final Map<String, SpriteGeometry> sprites;
  final Map<String, BackgroundLayers> backgrounds;
  final List<PropDef> props;
  final int auroraMinHouses;
  String get background => backgrounds['base']!.back;
  BackgroundLayers backgroundFor(int houseCount) => backgrounds[houseCount >= auroraMinHouses ? 'aurora' : 'base']!;
  final List<SlotDef> slots;
  final Offset treeAnchor;
  final double tileWorld;
  final double treeTileWorld;

  // Back → front (then left → right) — identical to the web.
  static const _cells = <(int, int, String)>[
    (-1, -1, 'rear'),
    (-1, 0, 'rear-left'),
    (0, -1, 'rear-right'),
    (-1, 1, 'left'),
    (1, -1, 'right'),
    (0, 1, 'front-left'),
    (1, 0, 'front-right'),
    (1, 1, 'front'),
  ];

  static Future<SceneGeometry> load() async =>
      SceneGeometry.fromJson(jsonDecode(await rootBundle.loadString('$artRoot/asset-geometry.json')) as Map<String, dynamic>);

  factory SceneGeometry.fromJson(Map<String, dynamic> j) {
    final layout = j['layout'] as Map<String, dynamic>;
    final center = Offset((layout['center'][0] as num).toDouble(), (layout['center'][1] as num).toDouble());
    final spacing = (layout['spacing'] as num).toDouble();
    final tileWorld = (layout['tileWidth'] as num).toDouble() * worldSize;
    final sprites = (j['sprites'] as Map<String, dynamic>)
        .map((k, v) => MapEntry(k, SpriteGeometry.fromJson(v as Map<String, dynamic>)));

    Offset cell(int i, int k) => Offset(
          (center.dx + (i - k) * spacing) * worldSize,
          (center.dy + (i + k) * spacing / 2) * worldSize,
        );

    final hitSprite = sprites['house_wood_lit']!;
    final slots = <SlotDef>[];
    for (var n = 0; n < _cells.length; n++) {
      final (i, k, position) = _cells[n];
      final anchor = cell(i, k);
      final rect = hitSprite.rectAt(anchor, tileWorld);
      slots.add(SlotDef(
        slot: n,
        position: position,
        anchor: anchor,
        hitPolygon: [for (final p in hitSprite.hull) Offset(rect.left + p.dx * rect.width, rect.top + p.dy * rect.height)],
      ));
    }
    String asset(String src) => '$artRoot${src.replaceFirst('/assets', '')}';
    final backgrounds = (j['backgrounds'] as Map<String, dynamic>).map((k, v) => MapEntry(
          k,
          BackgroundLayers(asset((v as Map)['src'] as String), asset(v['front'] as String)),
        ));
    final decor = j['decor'] as Map<String, dynamic>;
    final props = [
      for (final p in decor['props'] as List)
        PropDef(
          sprite: p['sprite'] as String,
          ground: Offset((p['ground'][0] as num).toDouble() * worldSize, (p['ground'][1] as num).toDouble() * worldSize),
          tile: (p['tile'] as num).toDouble() * worldSize,
          minHouses: (p['minHouses'] as num).toInt(),
        ),
    ];
    return SceneGeometry._(sprites, backgrounds, slots, cell(0, 0), tileWorld, tileWorld * (layout['treeScale'] as num).toDouble(),
        props, ((decor['aurora'] as Map)['minHouses'] as num).toInt());
  }

  /// Painter's order: rear → front by ground y, ties by x. Props appear once unlocked.
  List<SceneEntity> renderOrder([int houseCount = 0]) {
    final items = <(SceneEntity, double)>[
      for (final s in slots) (HouseEntity(s.slot, s.anchor.dy), s.anchor.dx),
      (TreeEntity(treeAnchor.dy), treeAnchor.dx),
      for (final p in props)
        if (houseCount >= p.minHouses) (PropEntity(p, p.ground.dy), p.ground.dx),
    ]..sort((a, b) {
        final d = a.$1.depth.compareTo(b.$1.depth);
        return d != 0 ? d : a.$2.compareTo(b.$2);
      });
    return [for (final i in items) i.$1];
  }

  String houseSprite(HouseStyle? style) => switch (style) {
        HouseStyle.wood => 'house_wood_lit',
        HouseStyle.sage => 'house_sage_lit',
        HouseStyle.indigo => 'house_indigo_lit',
        null => 'house_empty',
      };

  /// Front-most slot whose silhouette contains [p] (world coords), or null.
  int? slotAt(Offset p) {
    for (final s in slots.reversed) {
      if (s.hit.contains(p) && pointInPolygon(p, s.hitPolygon)) return s.slot;
    }
    return null;
  }
}

bool pointInPolygon(Offset p, List<Offset> poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    final a = poly[i];
    final b = poly[j];
    if ((a.dy > p.dy) != (b.dy > p.dy) && p.dx < (b.dx - a.dx) * (p.dy - a.dy) / (b.dy - a.dy) + a.dx) {
      inside = !inside;
    }
  }
  return inside;
}
