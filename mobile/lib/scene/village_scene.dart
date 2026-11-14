import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../data/models.dart';
import 'geometry.dart';

/// Village map (port of the web's VillageMap/VillageMapArt, layout v5): a snowy fir forest; the cathedral
/// plaza on a rise in the middle; the opened village as ONE rounded snow ground with paths to each opened
/// district, its landmark, decoration, houses facing their chosen direction and empty lots as a dashed
/// outline + "+". Closed districts stay forest with a dashed outline and their name. Pan and pinch-zoom;
/// taps resolve to a lot or a closed district.
/// Edit mode (village owner): the draft look is drawn, every movable decoration gets a drag handle,
/// and lots / districts are not tappable. A drop on a spot that breaks the placement rule snaps back.
/// Mirrors `edit` in VillageMap.tsx.
class LookEdit {
  const LookEdit({
    required this.pathStyle,
    required this.decor,
    required this.onMove,
  });
  final PathStyle pathStyle;
  final Map<String, Offset> decor;
  final void Function(String id, Offset at) onMove;
}

class VillageMapView extends StatefulWidget {
  const VillageMapView({
    super.key,
    required this.geometry,
    required this.village,
    this.myHouseId,
    this.igniteSlot,
    this.onSlotTap,
    this.onDistrictTap,
    this.slotLabel,
    this.districtLabel,
    this.interactive = true,
    this.edit,
  });

  /// Owner's look editor (null = normal map).
  final LookEdit? edit;

  /// False for decorative maps (home hero, create preview): no pan/zoom, no buttons, no names.
  final bool interactive;

  final VillageGeometry geometry;
  final Village village;
  final String? myHouseId;
  final int? igniteSlot;
  final void Function(int slot)? onSlotTap;
  final void Function(int district)? onDistrictTap;
  final String Function(int slot, House? house)? slotLabel;
  final String Function(int district)? districtLabel;

  @override
  State<VillageMapView> createState() => _VillageMapViewState();
}

class _VillageMapViewState extends State<VillageMapView> {
  final _controller = TransformationController();
  ui.Image? _snow;
  int _rinkFrame = 0;
  Timer? _rinkTimer;
  Size? _viewport;

  /// World rect the default camera shows: closed-district tags are drawn only when they fit inside it, so the
  /// small starting village is not framed by half-cut tags at the screen edges.
  Rect? _chipArea;
  int? _fittedFor;
  Village? _cacheFor;
  List<Offset> _shape = const [];
  List<MapEntity> _order = const [];
  Object? _lookKey;
  Village? _shown;

  /// Decoration being dragged (edit mode): where it is now and whether it may stay there.
  ({String id, double z, Offset at, bool ok})? _moving;
  final _worldKey = GlobalKey();

  VillageGeometry get g => widget.geometry;

  /// World area drawn: the whole forest land plus room above it for the hills.
  Rect get _world {
    final land = g.landOutline();
    final xs = land.map((p) => p.dx);
    final ys = land.map((p) => p.dy);
    return Rect.fromLTRB(
      xs.reduce(math.min) - tile * 2,
      ys.reduce(math.min) - tile * 6,
      xs.reduce(math.max) + tile * 2,
      ys.reduce(math.max) + tile * 2,
    ).expandToInclude(g.fullView());
  }

  @override
  void initState() {
    super.initState();
    _loadTexture();
    if (g.rinkFrames.length > 1) {
      _rinkTimer = Timer.periodic(const Duration(milliseconds: 140), (_) {
        if (mounted &&
            !(MediaQuery.maybeDisableAnimationsOf(context) ?? false)) {
          setState(() => _rinkFrame = (_rinkFrame + 1) % g.rinkFrames.length);
        }
      });
    }
  }

  Future<void> _loadTexture() async {
    final data = await rootBundle.load(g.snowTexture);
    final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
    final frame = await codec.getNextFrame();
    if (mounted) setState(() => _snow = frame.image);
  }

  @override
  void dispose() {
    _rinkTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// Fit the opened village into the viewport, like the web: fill the box, crop the sides a little on a
  /// tall phone, and never show more than ~19 tiles across (pan for the rest).
  void _fit(Size viewport) {
    final view = g.lotsView(widget.village.openHalves);
    final world = _world;
    final w = view.width;
    final h = view.height;
    final aspect = viewport.height / viewport.width;
    var nw = aspect > h / w ? math.max(w * 0.92, h / aspect) : h / aspect;
    nw = math.min(math.max(nw, VillageGeometry.minViewWidth), 1900);
    final scale = viewport.width / nw;
    final cx = view.center.dx - world.left;
    // Keep the bottom of the view above the land's front edge (no bare band under the forest). Same as map.ts.
    final limit = VillageGeometry.landBottom - tile * 0.6;
    final bottom = view.center.dy + nw * aspect / 2;
    final cy =
        view.center.dy - world.top - (bottom > limit ? bottom - limit : 0);
    final area = Rect.fromCenter(
      center: Offset(cx + world.left, cy + world.top),
      width: nw,
      height: nw * aspect,
    );
    if (area != _chipArea) setState(() => _chipArea = area);
    _controller.value = Matrix4.identity()
      ..translateByDouble(
        viewport.width / 2 - cx * scale,
        viewport.height / 2 - cy * scale,
        0,
        1,
      )
      ..scaleByDouble(scale, scale, 1, 1);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final viewport = Size(c.maxWidth, c.maxHeight);
        if (_viewport != viewport || _fittedFor != widget.village.openHalves) {
          _viewport = viewport;
          _fittedFor = widget.village.openHalves;
          WidgetsBinding.instance.addPostFrameCallback((_) => _fit(viewport));
        }
        final world = _world;
        final minScale = viewport.width / (g.fullView().width * 1.1);
        return ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      // Night-graded sky (the web's multiply #4B4C93 at 50 %).
                      colors: [
                        Color(0xFF0C112E),
                        Color(0xFF39336E),
                        Color(0xFF7474AA),
                      ],
                    ),
                  ),
                ),
              ),
              InteractiveViewer(
                transformationController: _controller,
                constrained: false,
                panEnabled: widget.interactive,
                scaleEnabled: widget.interactive,
                minScale: minScale,
                maxScale: 4,
                boundaryMargin: EdgeInsets.all(viewport.width),
                child: SizedBox(
                  key: _worldKey,
                  width: world.width,
                  height: world.height,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapUp: (d) {
                      if (widget.edit != null) return;
                      final p = d.localPosition + world.topLeft;
                      final slot = g.slotAt(widget.village, p);
                      if (slot != null) return widget.onSlotTap?.call(slot);
                      final district = g.districtAt(widget.village, p);
                      if (district != null) {
                        widget.onDistrictTap?.call(district);
                      }
                    },
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: _layers(world),
                    ),
                  ),
                ),
              ),
              // Dusk vignette over the scene (screen-fixed): keeps the eye on the village, as in the concept art.
              const Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        radius: 0.95,
                        colors: [Color(0x001A1C44), Color(0x611A1C44)],
                        stops: [0.55, 1],
                      ),
                    ),
                  ),
                ),
              ),
              if (widget.interactive)
                Positioned(
                  right: 8,
                  bottom: 8,
                  child: Row(
                    children: [
                      _ZoomButton(
                        key: const ValueKey('zoom-in'),
                        icon: Icons.add,
                        label: '+',
                        onTap: () => _zoom(1.35, viewport),
                      ),
                      const SizedBox(width: 6),
                      _ZoomButton(
                        key: const ValueKey('zoom-out'),
                        icon: Icons.remove,
                        label: '−',
                        onTap: () => _zoom(1 / 1.35, viewport),
                      ),
                      const SizedBox(width: 6),
                      _ZoomButton(
                        key: const ValueKey('zoom-fit'),
                        icon: Icons.fit_screen,
                        label: 'fit',
                        onTap: () => _fit(viewport),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _zoom(double f, Size viewport) {
    final m = _controller.value.clone();
    final center = Offset(viewport.width / 2, viewport.height / 2);
    _controller.value = Matrix4.identity()
      ..translateByDouble(center.dx, center.dy, 0, 1)
      ..scaleByDouble(f, f, 1, 1)
      ..translateByDouble(-center.dx, -center.dy, 0, 1)
      ..multiply(m);
  }

  /// The village as drawn: in edit mode with the draft path style and decorations (and the one being
  /// dragged at the finger). Cached so the rink animation does not rebuild the painter's order.
  Village get _drawn {
    final base = widget.village;
    final edit = widget.edit;
    final key = (base, edit?.pathStyle, edit?.decor, _moving);
    if (key != _lookKey || _shown == null) {
      _lookKey = key;
      final m = _moving;
      _shown = edit == null
          ? base
          : base.copyWith(
              pathStyle: edit.pathStyle,
              decor: {...edit.decor, if (m != null) m.id: m.at},
            );
    }
    return _shown!;
  }

  Widget _handles(Rect world, Village v) {
    final edit = widget.edit!;
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          // A ring ≥ 28 px across on screen and a 44 px touch circle, whatever the zoom.
          final scale = _controller.value.getMaxScaleOnAxis();
          final ring = math.max(30.0, 14 / scale);
          final touch = math.max(34.0, 22 / scale);
          return Stack(
            clipBehavior: Clip.none,
            children: [
              for (final f in g.movableDecor(v.openHalves, v.decor))
                () {
                  final c = project(f.i, f.j, f.z) - world.topLeft;
                  final active = _moving?.id == f.id;
                  final bad = active && !_moving!.ok;
                  return Positioned(
                    key: ValueKey('decor-${f.id}'),
                    left: c.dx - touch,
                    top: c.dy - touch,
                    width: touch * 2,
                    height: touch * 2,
                    child: Semantics(
                      label: 'decor ${f.id}',
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onPanStart: (_) => setState(
                          () => _moving = (
                            id: f.id,
                            z: f.z,
                            at: Offset(f.i, f.j),
                            ok: true,
                          ),
                        ),
                        onPanUpdate: (d) {
                          final m = _moving;
                          final box =
                              _worldKey.currentContext?.findRenderObject()
                                  as RenderBox?;
                          if (m == null || box == null) return;
                          final p =
                              box.globalToLocal(d.globalPosition) +
                              world.topLeft;
                          final at = groundAt(p, m.z);
                          setState(
                            () => _moving = (
                              id: m.id,
                              z: m.z,
                              at: at,
                              ok: g.decorSpotOk(
                                v.openHalves,
                                edit.decor,
                                m.id,
                                at,
                              ),
                            ),
                          );
                        },
                        onPanEnd: (_) {
                          final m = _moving;
                          if (m != null && m.ok) edit.onMove(m.id, m.at);
                          setState(() => _moving = null);
                        },
                        onPanCancel: () => setState(() => _moving = null),
                        child: Center(
                          child: Container(
                            width: ring * 2,
                            height: ring,
                            decoration: BoxDecoration(
                              color: bad
                                  ? const Color(0x73E0604A)
                                  : const Color(0x59FFFFFF),
                              borderRadius: BorderRadius.all(
                                Radius.elliptical(ring, ring / 2),
                              ),
                              border: Border.all(
                                color: bad
                                    ? const Color(0xFFC2412C)
                                    : const Color(0xFF5B4FA0),
                                width: ring * 0.09,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }(),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _layers(Rect world) {
    final v = _drawn;
    final open = v.openHalves;
    Offset w(Offset p) => p - world.topLeft;
    Rect wr(Rect r) => r.shift(-world.topLeft);
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    // Shape + painter's order only change with the village; the rink animation rebuilds every 140 ms.
    if (_cacheFor != v) {
      _cacheFor = v;
      _shape = g.villageShape(open);
      _order = g.mapOrder(v, _shape);
    }
    final shape = _shape;
    final order = _order;

    Widget sprite(
      String name,
      Rect r, {
      bool mirror = false,
      Key? key,
      bool fadeIn = false,
      String? asset,
      Matrix4? extra,
    }) {
      final rr = wr(r);
      Widget img = Image.asset(
        asset ?? g.sprites[name]!.asset,
        width: rr.width,
        height: rr.height,
        fit: BoxFit.fill,
        filterQuality: FilterQuality.medium,
        gaplessPlayback: true,
      );
      if (mirror) {
        img = Transform(
          alignment: Alignment.center,
          transform: Matrix4.diagonal3Values(-1, 1, 1),
          child: img,
        );
      }
      if (extra != null) img = Transform(transform: extra, child: img);
      if (fadeIn && !reduceMotion) {
        img = TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 600),
          builder: (_, t, child) => Opacity(opacity: t, child: child),
          child: img,
        );
      }
      return Positioned.fromRect(
        key: key,
        rect: rr,
        child: IgnorePointer(child: img),
      );
    }

    final layers = <Widget>[
      Positioned.fill(
        child: IgnorePointer(
          child: CustomPaint(
            painter: _GroundPainter(
              g: g,
              village: v,
              shape: shape,
              origin: world.topLeft,
              snow: _snow,
              ghosts: widget.interactive,
            ),
          ),
        ),
      ),
    ];

    for (final e in order) {
      switch (e) {
        case FacilityEntity(:final facility):
          final asset =
              facility.sprite == 'landmark_rink' && g.rinkFrames.isNotEmpty
              ? g.rinkFrames[_rinkFrame]
              : null;
          layers.add(
            sprite(
              facility.sprite,
              g.placeSprite(
                facility.sprite,
                facility.i,
                facility.j,
                facility.tiles,
                facility.z,
              ),
              asset: asset,
              key: ValueKey('f-${facility.id}'),
            ),
          );
        case TreeEntity(:final tree):
          layers.add(
            sprite(
              tree.sprite,
              g.placeSprite(tree.sprite, tree.i, tree.j, tree.tiles, tree.z),
              mirror: tree.mirror,
            ),
          );
        case LotEntity(:final lot):
          final c = w(project(lot.i, lot.j, lot.z));
          layers.add(
            Positioned(
              left: c.dx - 17,
              top: c.dy - 17,
              width: 34,
              height: 34,
              child: const IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(0xEBFFFFFF),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.add, size: 24, color: Color(0xFF7D74A8)),
                ),
              ),
            ),
          );
        case HouseEntity(:final lot):
          final h = v.houseAt(lot.slot)!;
          final view = g.houseView(h.style, h.direction);
          layers.add(
            sprite(
              view.sprite,
              g.placeSprite(view.sprite, lot.i, lot.j, houseTiles, lot.z),
              mirror: view.mirror,
              key: ValueKey('h-${lot.slot}-${h.style.name}-${h.direction}'),
              fadeIn: widget.igniteSlot == lot.slot,
            ),
          );
      }
    }

    // Night grade (concept image: deep blue night, warm lights): darken the scene, pool the light back on the
    // snow, then draw lit houses and light-giving props again so they stay bright. Mirrors VillageMapArt.tsx.
    layers.add(
      Positioned.fill(
        child: IgnorePointer(
          child: CustomPaint(
            painter: _NightPainter(g: g, village: v, origin: world.topLeft),
          ),
        ),
      ),
    );
    for (final e in order) {
      switch (e) {
        case FacilityEntity(:final facility)
            when _GroundPainter._glow.containsKey(facility.sprite):
          final r = wr(
            g.placeSprite(
              facility.sprite,
              facility.i,
              facility.j,
              facility.tiles,
              facility.z,
            ),
          );
          layers.add(
            Positioned.fromRect(
              rect: r,
              child: IgnorePointer(
                child: Opacity(
                  opacity: 0.62,
                  child: Image.asset(
                    g.sprites[facility.sprite]!.asset,
                    width: r.width,
                    height: r.height,
                    fit: BoxFit.fill,
                    filterQuality: FilterQuality.medium,
                  ),
                ),
              ),
            ),
          );
        case HouseEntity(:final lot):
          final h = v.houseAt(lot.slot)!;
          final view = g.houseView(h.style, h.direction);
          final r = wr(
            g.placeSprite(view.sprite, lot.i, lot.j, houseTiles, lot.z),
          );
          layers.add(
            Positioned.fromRect(
              rect: r,
              child: IgnorePointer(
                child: Opacity(
                  opacity: 0.62,
                  child: Transform.flip(
                    flipX: view.mirror,
                    child: Image.asset(
                      g.sprites[view.sprite]!.asset,
                      width: r.width,
                      height: r.height,
                      fit: BoxFit.fill,
                      filterQuality: FilterQuality.medium,
                    ),
                  ),
                ),
              ),
            ),
          );
        default:
          break;
      }
    }

    // Ghost districts: name tag in the middle; locked second halves: lock mark.
    for (final d in g.districts) {
      if (!widget.interactive || districtState(open, d.index) != 0) continue;
      final at = project(d.i, d.j, d.z);
      bool fits(Offset p) =>
          _chipArea == null || _chipArea!.deflate(12).contains(p);
      if (!fits(at.translate(-110, -24)) || !fits(at.translate(110, 24))) {
        continue;
      }
      final c = w(at);
      layers.add(
        Positioned(
          left: c.dx - 110,
          top: c.dy - 24,
          width: 220,
          height: 48,
          child: IgnorePointer(
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xB81C284A),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '🔒 ${d.name(Localizations.localeOf(context).languageCode)}',
                  style: const TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFF6F0E4),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    for (final l in g.lots) {
      if (l.half != 1 || districtState(open, l.district) != 1) continue;
      final c = w(project(l.i, l.j, l.z));
      layers.add(
        Positioned(
          left: c.dx - 20,
          top: c.dy - 20,
          width: 40,
          height: 40,
          child: const IgnorePointer(
            child: Center(child: Text('🔒', style: TextStyle(fontSize: 24))),
          ),
        ),
      );
    }

    // Name chips over roofs (interactive maps only).
    for (final h in widget.interactive ? v.houses : const <House>[]) {
      final lot = g.lots[h.slot];
      final c = w(project(lot.i, lot.j, lot.z));
      final mine = h.id == widget.myHouseId;
      layers.add(
        Positioned(
          left: c.dx - 120,
          top: c.dy - tile * houseTiles * 1.12 - 20,
          width: 240,
          height: 40,
          child: IgnorePointer(
            child: Center(
              child: _NameChip(text: h.nickname, mine: mine),
            ),
          ),
        ),
      );
    }

    if (widget.edit != null) layers.add(_handles(world, v));

    // Accessibility nodes (screen readers, UI tests): one per lot and per closed district.
    if (widget.onSlotTap != null && widget.edit == null) {
      for (final l in g.visibleLots(open)) {
        final c = w(project(l.i, l.j, l.z));
        final house = v.houseAt(l.slot);
        layers.add(
          Positioned(
            left: c.dx - 50,
            top: c.dy - (house != null ? 120 : 40),
            width: 100,
            height: house != null ? 140 : 80,
            child: Semantics(
              key: ValueKey('slot-${l.slot}'),
              button: true,
              label: widget.slotLabel?.call(l.slot, house),
              onTap: () => widget.onSlotTap!(l.slot),
              child: const SizedBox.expand(),
            ),
          ),
        );
      }
      for (final d in g.districts) {
        if (districtState(open, d.index) == 2) continue;
        final c = w(project(d.i, d.j, d.z));
        layers.add(
          Positioned(
            left: c.dx - 60,
            top: c.dy + 30,
            width: 120,
            height: 40,
            child: Semantics(
              key: ValueKey('district-${d.index}'),
              button: true,
              label: widget.districtLabel?.call(d.index),
              onTap: () => widget.onDistrictTap?.call(d.index),
              child: const SizedBox.expand(),
            ),
          ),
        );
      }
    }
    return layers;
  }
}

/// Night grade over the world: multiply a deep blue (50 %), then warm light pools in screen mode.
class _NightPainter extends CustomPainter {
  _NightPainter({required this.g, required this.village, required this.origin});
  final VillageGeometry g;
  final Village village;
  final Offset origin;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..color = const Color(0x804B4C93)
        ..blendMode = BlendMode.multiply,
    );
    canvas.translate(-origin.dx, -origin.dy);
    void pool(Offset c, double r) {
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.scale(1, 0.5);
      canvas.translate(-c.dx, -c.dy);
      canvas.drawCircle(
        c,
        r * 0.9,
        Paint()
          ..blendMode = BlendMode.screen
          ..shader = ui.Gradient.radial(
            c,
            r * 0.9,
            const [Color(0xB3FFC36A), Color(0x47FFB45C), Color(0x00FFB45C)],
            const [0, 0.45, 1],
          ),
      );
      canvas.restore();
    }

    for (final f in g.facilitiesFor(village.openHalves, village.decor)) {
      final r = _GroundPainter._glow[f.sprite];
      if (r != null) pool(project(f.i, f.j, f.z), r);
    }
    final taken = {for (final h in village.houses) h.slot};
    for (final l in g.lots) {
      if (taken.contains(l.slot)) pool(project(l.i, l.j, l.z), 150);
    }
  }

  @override
  bool shouldRepaint(_NightPainter old) =>
      old.village != village || old.origin != origin;
}

class _GroundPainter extends CustomPainter {
  _GroundPainter({
    required this.g,
    required this.village,
    required this.shape,
    required this.origin,
    required this.snow,
    required this.ghosts,
  });
  final VillageGeometry g;
  final Village village;
  final List<Offset> shape;
  final Offset origin;
  final ui.Image? snow;
  final bool ghosts;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.translate(-origin.dx, -origin.dy);
    final open = village.openHalves;
    Path poly(List<Offset> pts) => Path()..addPolygon(pts, true);
    final world = origin & size;

    // Backdrop: two hill bands at the horizon, then the snowfield and the forest land.
    final land = g.landOutline();
    final horizon = land.map((p) => p.dy).reduce(math.min) + 60;
    Path hill(double base, double amp, double phase) {
      final path = Path()..moveTo(world.left, base + 400);
      for (var x = world.left; x <= world.right + 40; x += 40) {
        path.lineTo(
          x,
          base -
              amp *
                  (0.55 +
                      0.45 *
                          math.sin(x / 190 + phase) *
                          math.cos(x / 430 + phase * 2)),
        );
      }
      return path
        ..lineTo(world.right + 40, base + 400)
        ..close();
    }

    // Aurora (enough houses): a soft band in the sky just above the hills (behind them).
    if (village.houses.length >= g.auroraMinHouses) {
      final vb = g.lotsView(open);
      final w = vb.width * 1.3;
      final x = vb.center.dx - w / 2;
      const h = 420.0;
      final y = horizon - 330;
      final band = Path()
        ..moveTo(x, y + h * 0.45)
        ..cubicTo(x + w * 0.3, y, x + w * 0.6, y + h * 0.55, x + w, y + h * 0.2)
        ..lineTo(x + w, y + h * 0.5)
        ..cubicTo(
          x + w * 0.6,
          y + h * 0.95,
          x + w * 0.3,
          y + h * 0.3,
          x,
          y + h * 0.8,
        )
        ..close();
      canvas.drawPath(
        band,
        Paint()
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18)
          ..shader = ui.Gradient.linear(
            Offset(x, 0),
            Offset(x + w, 0),
            const [
              Color(0x005FE3B0),
              Color(0xA65FE3B0),
              Color(0x8C8FB7FF),
              Color(0x00C58CFF),
            ],
            const [0, 0.35, 0.7, 1],
          ),
      );
    }

    canvas.drawPath(
      hill(horizon, 160, 0.4),
      Paint()..color = const Color(0xFF5A5F9A),
    );
    canvas.drawPath(
      hill(horizon + 45, 100, 1.7),
      Paint()..color = const Color(0xFF7C80B8),
    );
    final field = Rect.fromLTRB(
      world.left,
      horizon + 70,
      world.right,
      world.bottom,
    );
    canvas.drawRect(
      field,
      Paint()
        ..shader = ui.Gradient.linear(
          field.topCenter,
          field.bottomCenter,
          const [Color(0xFF8F92C2), Color(0xFFB4B3D8), Color(0xFFD2CFE8)],
          const [0, 0.12, 1],
        ),
    );
    // Closed districts stay plain forest (their name chips are widgets on top).

    final tex = _texture();

    // The village ground: ONE smooth cleared snowfield, level with the forest (owner 2026-11-14: no raised slab).
    _clearing(canvas, [for (final p in shape) project(p.dx, p.dy)], tex);

    final opened = g.openDistricts(open);
    if (!plazaShown(open)) {
      // Free village (district 0 alone): no plaza yet; a fence all around its snowy base, like the first concept.
      _fence(canvas, villageFence(shape), 0);
    } else {
      // Behind the cathedral mound the snow rises gently to it (no wall there): shaded toward its foot,
      // bright toward the top. In front and at the sides the mound is walled and fenced.
      final slope = plazaSlope(g.plazaArea);
      Offset gz(GZ p) => project(p.$1, p.$2, p.$3);
      final slopeFoot = Paint()
        ..color = const Color(0xFFD6CFEA)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
      final slopeTop = Paint()
        ..color = const Color(0xFFFFFFFF)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
      for (final q in slope) {
        canvas.drawPath(poly([for (final p in q) gz(p)]), slopeFoot);
      }
      for (final q in slope) {
        GZ mid(GZ t, GZ f) => (
          t.$1 + (f.$1 - t.$1) * 0.55,
          t.$2 + (f.$2 - t.$2) * 0.55,
          t.$3 + (f.$3 - t.$3) * 0.55,
        );
        canvas.drawPath(
          poly([gz(q[0]), gz(q[1]), gz(mid(q[1], q[2])), gz(mid(q[0], q[3]))]),
          slopeTop,
        );
      }

      // Cathedral mound: a slightly brown dirt yard with snow piled along its rim.
      _slab(
        canvas,
        g.plazaArea.projected,
        (g.plazaArea.z + 0.05) * elevationPx,
        tex,
        lip: 10,
        rim: 0.75,
        rimColor: const Color(0xFFFFFFFF),
        top: const Color(0xFFB59A85),
        texture: 0x33,
      );

      // Paths from the plaza to each opened clearing in the village's path style; wooden steps where one
      // leaves the walled side.
      for (final d in opened) {
        final band = pathBand(d.path, g.plazaArea, g.pathWidth * 0.92);
        if (band.left.length >= 2) {
          switch (village.pathStyle) {
            case PathStyle.dirt:
              _dirtPath(canvas, band);
            case PathStyle.stones:
              _stonesPath(canvas, band, d.index);
            case PathStyle.brick:
              _brickPath(canvas, band);
            case PathStyle.snow:
              _snowPath(canvas, band);
          }
        }
        _steps(canvas, pathSteps(d.path, g.plazaArea));
      }
      _fence(
        canvas,
        plazaFence([for (final d in opened) d.path], g.plazaArea),
        g.plazaArea.z,
      );
    }

    // Frozen pond (lake district).
    for (final d in opened) {
      final pond = d.pond;
      if (pond == null) continue;
      final ring = [for (final p in pond) project(p.dx, p.dy, d.z)];
      final c = project(d.i, d.j, d.z);
      canvas.drawPath(poly(ring), Paint()..color = const Color(0xFFA9CFE6));
      canvas.drawPath(
        poly(ring),
        Paint()
          ..color = const Color(0xFF7FA9C4)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4,
      );
      canvas.drawPath(
        poly([for (final p in ring) c + (p - c) * 0.72 - const Offset(0, 4)]),
        Paint()..color = const Color(0xCCCDE6F4),
      );
      final glint = Paint()
        ..color = const Color(0xE6FFFFFF)
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        c + const Offset(-40, -6),
        c + const Offset(-6, -16),
        glint,
      );
      canvas.drawLine(c + const Offset(8, 10), c + const Offset(38, 1), glint);
    }

    // Warm light pooling on the snow under lit houses, lamps and the cathedral.
    final taken = {for (final h in village.houses) h.slot};
    void glow(Offset c, double r) {
      final rect = Rect.fromCenter(center: c, width: r * 2, height: r);
      canvas.drawOval(
        rect,
        Paint()
          ..shader = ui.Gradient.radial(
            c,
            r,
            const [Color(0xB3FFC36A), Color(0x47FFB45C), Color(0x00FFB45C)],
            const [0, 0.45, 1],
            TileMode.clamp,
            Float64List.fromList([
              1,
              0,
              0,
              0,
              0,
              0.5,
              0,
              0,
              0,
              0,
              1,
              0,
              0,
              c.dy * 0.5,
              0,
              1,
            ]),
          ),
      );
    }

    for (final f in g.facilitiesFor(open, village.decor)) {
      final r = _glow[f.sprite];
      if (r != null) glow(project(f.i, f.j, f.z), r);
    }
    for (final l in g.lots) {
      if (taken.contains(l.slot)) glow(project(l.i, l.j, l.z), 150);
    }

    // Empty lots: dashed outline; locked second halves: grey dashed outline.
    final lotFill = Paint()..color = const Color(0x80FFFFFF);
    final lockFill = Paint()..color = const Color(0x26B8C4D6);
    final lotLine = Paint()
      ..color = const Color(0xFFA49CC8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2;
    final lockLine = Paint()
      ..color = const Color(0x997D8CA6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    for (final l in g.lots) {
      final isOpen = isHalfOpen(open, l.slot);
      final halfLocked = l.half == 1 && districtState(open, l.district) == 1;
      if ((isOpen && !taken.contains(l.slot)) || halfLocked) {
        final d = tileDiamond(l.i, l.j, houseTiles * 0.62, l.z);
        canvas.drawPath(poly(d), halfLocked ? lockFill : lotFill);
        _dashed(canvas, d, halfLocked ? lockLine : lotLine, 7, 7);
      }
    }
  }

  /// Snow texture laid on the ground plane (repeats every 3 tiles).
  Paint? _texture() {
    final img = snow;
    if (img == null) return null;
    const s = 3.0;
    final px = img.width.toDouble();
    final m = Float64List.fromList([
      (tile / 2) * s / px,
      (tile / 4) * s / px,
      0,
      0,
      (-tile / 2) * s / px,
      (tile / 4) * s / px,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    ]);
    return Paint()
      ..shader = ImageShader(img, TileMode.repeated, TileMode.repeated, m);
  }

  /// A dirt path: soft dusky edge, the brown band, a lighter worn middle and snow banked along both edges.
  /// Mirrors `DirtPath` in VillageMapArt.tsx.
  void _dirtPath(Canvas canvas, ({List<GZ> left, List<GZ> right}) band) {
    if (band.left.length < 2) return;
    Offset gz(GZ p) => project(p.$1, p.$2, p.$3);
    final l = [for (final p in band.left) gz(p)];
    final r = [for (final p in band.right) gz(p)];
    final body = Path()..addPolygon([...l, ...r.reversed], true);
    canvas.drawPath(
      body,
      Paint()
        ..color = const Color(0x595E4A64)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6)
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      body,
      Paint()
        ..color = const Color(0x595E4A64)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 14
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(body, Paint()..color = const Color(0xFF9A7A62));
    canvas.drawPath(
      body,
      Paint()
        ..color = const Color(0xFF9A7A62)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round,
    );
    GZ lerp(GZ a, GZ b, double f) =>
        (a.$1 + (b.$1 - a.$1) * f, a.$2 + (b.$2 - a.$2) * f, a.$3);
    final n = band.left.length;
    final middle = Path()
      ..addPolygon([
        for (var k = 0; k < n; k++) gz(lerp(band.left[k], band.right[k], 0.3)),
        for (var k = n - 1; k >= 0; k--)
          gz(lerp(band.right[k], band.left[k], 0.3)),
      ], true);
    canvas.drawPath(
      middle,
      Paint()
        ..color = const Color(0x8CB4937A)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );
    final edge = Paint()
      ..color = const Color(0xD9F7F4FC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    canvas.drawPath(Path()..addPolygon(l, false), edge);
    canvas.drawPath(Path()..addPolygon(r, false), edge);
  }

  /// Point at sample [k] of a band, fraction [f] across it (0 = left edge, 1 = right edge).
  static Offset _across(
    ({List<GZ> left, List<GZ> right}) band,
    int k,
    double f,
  ) {
    final l = band.left[k];
    final r = band.right[k];
    return project(l.$1 + (r.$1 - l.$1) * f, l.$2 + (r.$2 - l.$2) * f, l.$3);
  }

  static double _rnd(num k) {
    final x = math.sin(k * 12.9898 + 78.233) * 43758.5453;
    return x - x.floorToDouble();
  }

  /// Trodden snow under stepping stones / footprints: a soft lavender band without a hard edge.
  void _snowBand(
    Canvas canvas,
    ({List<GZ> left, List<GZ> right}) band,
    double opacity,
  ) {
    Offset gz(GZ p) => project(p.$1, p.$2, p.$3);
    final body = Path()
      ..addPolygon([
        for (final p in band.left) gz(p),
        for (final p in band.right.reversed) gz(p),
      ], true);
    final paint = Paint()
      ..color = const Color(0xFFBDB2D6).withValues(alpha: opacity)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawPath(body, paint);
    canvas.drawPath(
      body,
      paint
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..strokeJoin = StrokeJoin.round,
    );
  }

  /// Stepping stones: one stone every 0.48 tiles, alternating a little left/right, never touching.
  /// Mirrors `StonesPath` in VillageMapArt.tsx.
  void _stonesPath(
    Canvas canvas,
    ({List<GZ> left, List<GZ> right}) band,
    int seed,
  ) {
    _snowBand(canvas, band, 0.5);
    final shadow = Paint()..color = const Color(0x594E4670);
    final light = Paint()..color = const Color(0xD9D2C9C2);
    final cap = Paint()..color = const Color(0xF2FFFFFF);
    var n = 0;
    for (var k = 2; k < band.left.length; k += 4, n++) {
      final c = _across(band, k, n.isOdd ? 0.36 : 0.64);
      final h = _rnd(seed * 101 + n);
      final rx = (0.17 + h * 0.03) * tile * 0.72;
      final ry = rx * 0.52;
      canvas.drawOval(
        Rect.fromCenter(
          center: c + const Offset(1, 3.5),
          width: rx * 2,
          height: ry * 2,
        ),
        shadow,
      );
      canvas.drawOval(
        Rect.fromCenter(center: c, width: rx * 2, height: ry * 2),
        Paint()
          ..color = h < 0.33
              ? const Color(0xFF9A8F8A)
              : h < 0.66
              ? const Color(0xFFA89D96)
              : const Color(0xFFB4AAA2),
      );
      canvas.drawOval(
        Rect.fromCenter(
          center: c + Offset(-rx * 0.12, -ry * 0.22),
          width: rx * 1.32,
          height: ry,
        ),
        light,
      );
      if (h > 0.6) {
        canvas.drawOval(
          Rect.fromCenter(
            center: c + Offset(rx * 0.3, -ry * 0.25),
            width: rx * 0.8,
            height: ry * 0.68,
          ),
          cap,
        );
      }
    }
  }

  /// Brick path: muted red-brown band in running bond (rows every 0.24 tiles), snow banked along the
  /// edges. Mirrors `BrickPath` in VillageMapArt.tsx.
  void _brickPath(Canvas canvas, ({List<GZ> left, List<GZ> right}) band) {
    Offset gz(GZ p) => project(p.$1, p.$2, p.$3);
    final l = [for (final p in band.left) gz(p)];
    final r = [for (final p in band.right) gz(p)];
    final body = Path()..addPolygon([...l, ...r.reversed], true);
    final under = Paint()
      ..color = const Color(0x595E4A64)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawPath(body, under);
    canvas.drawPath(
      body,
      under
        ..style = PaintingStyle.stroke
        ..strokeWidth = 14
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(body, Paint()..color = const Color(0xFFA4675A));
    final joint = Paint()
      ..color = const Color(0xD97B4A44)
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    final rows = [for (var k = 0; k < l.length; k += 2) k];
    for (var n = 0; n < rows.length; n++) {
      final k = rows[n];
      canvas.drawLine(l[k], r[k], joint);
      if (n + 1 >= rows.length) continue;
      for (final f in n.isOdd ? const [0.25, 0.75] : const [0.5]) {
        canvas.drawLine(
          _across(band, k, f),
          _across(band, rows[n + 1], f),
          joint,
        );
      }
    }
    canvas.drawPath(body, Paint()..color = const Color(0x1FFFFFFF));
    final edge = Paint()
      ..color = const Color(0xD9F7F4FC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    canvas.drawPath(Path()..addPolygon(l, false), edge);
    canvas.drawPath(Path()..addPolygon(r, false), edge);
  }

  /// Snow path: a trodden lavender band with a line of small footprints. Mirrors `SnowPath`.
  void _snowPath(Canvas canvas, ({List<GZ> left, List<GZ> right}) band) {
    _snowBand(canvas, band, 0.75);
    final print = Paint()..color = const Color(0xBF9F95C4);
    var n = 0;
    for (var k = 1; k < band.left.length; k += 3, n++) {
      canvas.drawOval(
        Rect.fromCenter(
          center: _across(band, k, n.isOdd ? 0.4 : 0.6),
          width: 9,
          height: 5.2,
        ),
        print,
      );
    }
  }

  /// The plaza fence: snow-capped wooden posts, two rails with snow on the top one, and a string of warm
  /// lights. Mirrors `Fence` in VillageMapArt.tsx.
  void _fence(Canvas canvas, List<List<Offset>> runs, double z) {
    const h = 30.0;
    final rail = Paint()
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    final postLit = Paint()..color = const Color(0xFF7A5038);
    final postShade = Paint()..color = const Color(0xFF5E3C2A);
    final cap = Paint()..color = const Color(0xFFFFFFFF);
    final halo = Paint()..color = const Color(0x4DFFC36A);
    final bulb = Paint()..color = const Color(0xFFFFE2A0);
    for (final run in runs) {
      final p = [for (final q in run) project(q.dx, q.dy, z)];
      for (var k = 0; k + 1 < p.length; k++) {
        final a = p[k];
        final b = p[k + 1];
        canvas.drawLine(
          a.translate(0, -9),
          b.translate(0, -9),
          rail
            ..color = const Color(0xFF6B4632)
            ..strokeWidth = 4,
        );
        canvas.drawLine(
          a.translate(0, -21),
          b.translate(0, -21),
          rail
            ..color = const Color(0xFF7A5038)
            ..strokeWidth = 4.5,
        );
        canvas.drawLine(
          a.translate(0, -24),
          b.translate(0, -24),
          rail
            ..color = const Color(0xFFFBFAFE)
            ..strokeWidth = 3.5,
        );
      }
      for (final q in p) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(q.dx - 4, q.dy - h, 8, h + 2),
            const Radius.circular(1.5),
          ),
          postLit,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(q.dx, q.dy - h, 4, h + 2),
            const Radius.circular(1.5),
          ),
          postShade,
        );
        canvas.drawOval(
          Rect.fromCenter(center: q.translate(0, -h), width: 13, height: 7.2),
          cap,
        );
      }
      for (var k = 0; k + 1 < p.length; k++) {
        for (final t in const [0.25, 0.5, 0.75]) {
          final c = Offset(
            p[k].dx + (p[k + 1].dx - p[k].dx) * t,
            p[k].dy +
                (p[k + 1].dy - p[k].dy) * t -
                26 +
                math.sin(math.pi * t) * 6,
          );
          canvas.drawCircle(c, 6, halo);
          canvas.drawCircle(c, 2.4, bulb);
        }
      }
    }
  }

  /// Wooden steps down the plaza mound: dark riser (silhouette), plank top, a snow line on the front edge.
  void _steps(Canvas canvas, List<PathStep> steps) {
    for (final st in steps) {
      final top = [for (final p in st.corners) project(p.dx, p.dy, st.z)];
      final foot = [for (final p in st.corners) project(p.dx, p.dy)];
      canvas.drawPath(
        Path()..addPolygon(convexHull([...top, ...foot]), true),
        Paint()..color = const Color(0xFF5E4434),
      );
      canvas.drawPath(
        Path()..addPolygon(top, true),
        Paint()..color = const Color(0xFF9C7656),
      );
      canvas.drawLine(
        top[1],
        top[2],
        Paint()
          ..color = const Color(0xBFF6F2FB)
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  /// The village ground: a cleared snowfield level with the forest floor. A wide blurred band of snow spills
  /// past the edge so it blends into the field instead of ending in a cut. Mirrors `Clearing` in VillageMapArt.tsx.
  void _clearing(Canvas canvas, List<Offset> outline, Paint? tex) {
    final surface = Path()..addPolygon(outline, true);
    canvas.drawPath(
      surface,
      Paint()
        ..color = const Color(0xD9E4E1F2)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    canvas.drawPath(
      surface,
      Paint()
        ..color = const Color(0xD9E4E1F2)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 70
        ..strokeJoin = StrokeJoin.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    final b = surface.getBounds();
    canvas.drawPath(
      surface,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(b.center.dx, b.top + b.height * 0.45),
          b.longestSide * 0.6,
          const [Color(0xFFFFFFFF), Color(0xFFF5F3FB), Color(0xFFE2DEF0)],
          const [0, 0.7, 1],
        )
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );
    if (tex != null) {
      canvas.drawPath(surface, tex..color = const Color(0xB3FFFFFF));
    }
  }

  /// Warm light pool radius (px) per light-giving sprite. Same as the web (`GLOW`).
  static const _glow = {
    'prop_lamp': 75.0,
    'prop_snowman_lantern': 55.0,
    'landmark_cathedral': 230.0,
    'tree_complete': 120.0,
    'landmark_santa': 150.0,
  };

  /// A raised snowy slab: stone wall sides with mortar joints, a soft shadow under a rounded snow lip, the top,
  /// then inner shading along the rim so the snow reads as a soft pillow. Mirrors `Slab` in VillageMapArt.tsx.
  void _slab(
    Canvas canvas,
    List<Offset> outline,
    double drop,
    Paint? tex, {
    required double lip,
    required double rim,
    Color rimColor = const Color(0xFFB3AAD6),
    Color top = const Color(0xFFFFFFFF),
    int texture = 0xB3,
  }) {
    final ys = outline.map((p) => p.dy);
    final minY = ys.reduce(math.min);
    final maxY = ys.reduce(math.max);
    final bank = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, minY),
        Offset(0, maxY + drop),
        const [Color(0xFFA7A1C2), Color(0xFF6C668F)],
      );
    final sides = Path();
    for (var k = 0; k < outline.length; k++) {
      final p = outline[k];
      final q = outline[(k + 1) % outline.length];
      sides.addPolygon([p, q, q + Offset(0, drop), p + Offset(0, drop)], true);
    }
    canvas.drawPath(sides, bank);
    canvas.drawPath(
      sides,
      bank
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    Path shifted(double d) =>
        Path()..addPolygon([for (final p in outline) p + Offset(0, d)], true);
    if (drop > 24) {
      final mortar = Paint()
        ..color = const Color(0x73575174)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawPath(shifted(drop * 0.5), mortar);
      for (var k = 0; k < outline.length; k += 2) {
        final p = outline[k];
        final upper = (k ~/ 2).isEven;
        canvas.drawLine(
          p + Offset(0, upper ? drop * 0.1 : drop * 0.5),
          p + Offset(0, upper ? drop * 0.5 : drop),
          mortar..color = const Color(0x66575174),
        );
      }
    }
    canvas.drawPath(
      shifted(lip * 0.6),
      Paint()
        ..color = const Color(0x664A4470)
        ..style = PaintingStyle.stroke
        ..strokeWidth = lip * 1.2
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );
    final surface = Path()..addPolygon(outline, true);
    final b = surface.getBounds();
    canvas.drawPath(
      surface,
      Paint()
        ..color = const Color(0xFFFAF8FE)
        ..style = PaintingStyle.stroke
        ..strokeWidth = lip
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      surface,
      top == const Color(0xFFFFFFFF)
          ? (Paint()
              ..shader = ui.Gradient.radial(
                Offset(b.center.dx, b.top + b.height * 0.45),
                b.longestSide * 0.6,
                const [Color(0xFFFFFFFF), Color(0xFFF5F3FB), Color(0xFFE2DEF0)],
                const [0, 0.7, 1],
              ))
          : (Paint()..color = top),
    );
    if (tex != null) {
      canvas.drawPath(surface, tex..color = Color(0xFFFFFF | (texture << 24)));
    }
    canvas.save();
    canvas.clipPath(surface);
    canvas.drawPath(
      surface,
      Paint()
        ..color = rimColor.withValues(alpha: rim)
        ..style = PaintingStyle.stroke
        ..strokeWidth = lip * 5
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    canvas.restore();
  }

  /// Dashed polyline with a continuous dash phase across corners.
  void _dashed(
    Canvas canvas,
    List<Offset> pts,
    Paint paint,
    double dash,
    double gap,
  ) {
    var phase = 0.0; // distance into the current dash+gap period
    for (var k = 0; k < pts.length; k++) {
      final a = pts[k];
      final b = pts[(k + 1) % pts.length];
      final len = (b - a).distance;
      if (len == 0) continue;
      final dir = (b - a) / len;
      var t = 0.0;
      while (t < len) {
        final inDash = phase < dash;
        final step = math.min(
          len - t,
          inDash ? dash - phase : dash + gap - phase,
        );
        if (inDash) canvas.drawLine(a + dir * t, a + dir * (t + step), paint);
        t += step;
        phase = (phase + step) % (dash + gap);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _GroundPainter old) =>
      old.village != village ||
      old.snow != snow ||
      old.origin != origin ||
      old.ghosts != ghosts;
}

class _ZoomButton extends StatelessWidget {
  const _ZoomButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    child: Material(
      color: const Color(0xE6F6F0E4),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, color: const Color(0xFF1C284A)),
        ),
      ),
    ),
  );
}

class _NameChip extends StatelessWidget {
  const _NameChip({required this.text, required this.mine});
  final String text;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 230),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: mine ? const Color(0xFF1C284A) : const Color(0xF2F6F0E4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        mine ? '★ $text' : text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: mine ? const Color(0xFFF6F0E4) : const Color(0xFF1C284A),
        ),
      ),
    );
  }
}
