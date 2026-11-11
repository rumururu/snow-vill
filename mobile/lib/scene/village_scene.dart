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
  });

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
  int? _fittedFor;
  Village? _cacheFor;
  List<Offset> _shape = const [];
  List<MapEntity> _order = const [];

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
    nw = math.min(nw, 1900);
    final scale = viewport.width / nw;
    final cx = view.center.dx - world.left;
    final cy = view.center.dy - world.top;
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
                      colors: [
                        Color(0xFF1C284A),
                        Color(0xFF3A4E7A),
                        Color(0xFFB7C5DA),
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
                  width: world.width,
                  height: world.height,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapUp: (d) {
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
              if (widget.interactive)
                Positioned(
                  right: 8,
                  bottom: 8,
                  child: Row(
                    children: [
                      _ZoomButton(
                        icon: Icons.add,
                        label: '+',
                        onTap: () => _zoom(1.35, viewport),
                      ),
                      const SizedBox(width: 6),
                      _ZoomButton(
                        icon: Icons.remove,
                        label: '−',
                        onTap: () => _zoom(1 / 1.35, viewport),
                      ),
                      const SizedBox(width: 6),
                      _ZoomButton(
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

  List<Widget> _layers(Rect world) {
    final v = widget.village;
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
              left: c.dx - 30,
              top: c.dy - 22,
              width: 60,
              height: 44,
              child: const IgnorePointer(
                child: Center(
                  child: Text(
                    '+',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF708B82),
                    ),
                  ),
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

    // Ghost districts: name tag in the middle; locked second halves: lock mark.
    for (final d in g.districts) {
      if (!widget.interactive || districtState(open, d.index) != 0) continue;
      final c = w(project(d.i, d.j, d.z));
      layers.add(
        Positioned(
          left: c.dx - 120,
          top: c.dy - 28,
          width: 240,
          height: 56,
          child: IgnorePointer(
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xD91C284A),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '🔒 ${Localizations.localeOf(context).languageCode == 'ko' ? d.nameKo : d.nameEn}',
                  style: const TextStyle(
                    fontSize: 26,
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

    // Accessibility nodes (screen readers, UI tests): one per lot and per closed district.
    if (widget.onSlotTap != null) {
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

    canvas.drawPath(
      hill(horizon, 160, 0.4),
      Paint()..color = const Color(0xFF3B4C74),
    );
    canvas.drawPath(
      hill(horizon + 45, 100, 1.7),
      Paint()..color = const Color(0xFF56688F),
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
          const [Color(0xFFB7C5DA), Color(0xFFD3DDEA), Color(0xFFE9EFF6)],
          const [0, 0.12, 1],
        ),
    );
    canvas.drawPath(poly(land), Paint()..color = const Color(0xFFDCE4EF));

    // Ghost districts: dashed outline (the forest still covers them).
    if (ghosts) {
      final ghost = Paint()..color = const Color(0x1AFFFFFF);
      final ghostLine = Paint()
        ..color = const Color(0xCCFFFFFF)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3;
      for (final d in g.districts) {
        if (districtState(open, d.index) != 0) continue;
        canvas.drawPath(poly(d.projected), ghost);
        _dashed(canvas, d.projected, ghostLine, 14, 12);
      }
    }

    final tex = _texture();

    // The village ground: ONE rounded shape — bank first, then the snowy top.
    final top = [for (final p in shape) project(p.dx, p.dy)];
    _bank(canvas, top, 0.45 * elevationPx);
    canvas.drawPath(poly(top), Paint()..color = const Color(0xFFF4F7FB));
    if (tex != null) {
      canvas.drawPath(poly(top), tex..color = const Color(0xD9FFFFFF));
    }

    // Cathedral mound.
    final mound = g.plazaArea.projected;
    _bank(canvas, mound, (g.plazaArea.z + 0.05) * elevationPx);
    canvas.drawPath(poly(mound), Paint()..color = const Color(0xFFDCD3C6));
    if (tex != null) {
      canvas.drawPath(poly(mound), tex..color = const Color(0x59FFFFFF));
    }

    // Paths from the plaza to each opened clearing.
    final opened = g.openDistricts(open);
    for (final d in opened) {
      canvas.drawPath(
        poly(pathPolygon(d.path, g.pathWidth + 0.25)),
        Paint()..color = const Color(0x80B9AE9F),
      );
      canvas.drawPath(
        poly(pathPolygon(d.path, g.pathWidth)),
        Paint()..color = const Color(0xFFD6CCBE),
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

    // Empty lots: dashed outline; locked second halves: grey dashed outline.
    final taken = {for (final h in village.houses) h.slot};
    final lotFill = Paint()..color = const Color(0x99FFFFFF);
    final lockFill = Paint()..color = const Color(0x26B8C4D6);
    final lotLine = Paint()
      ..color = const Color(0xFF708B82)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
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
        _dashed(canvas, d, halfLocked ? lockLine : lotLine, 8, 7);
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

  /// Side wall under an outline: one quad per edge, dropped by [drop] px (only the front ones show).
  void _bank(Canvas canvas, List<Offset> top, double drop) {
    final ys = top.map((p) => p.dy);
    final paint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, ys.reduce(math.min)),
        Offset(0, ys.reduce(math.max) + drop),
        const [Color(0xFFC3CEDF), Color(0xFF9DABC2)],
      );
    final path = Path();
    for (var k = 0; k < top.length; k++) {
      final p = top[k];
      final q = top[(k + 1) % top.length];
      path.addPolygon([p, q, q + Offset(0, drop), p + Offset(0, drop)], true);
    }
    canvas.drawPath(path, paint);
    canvas.drawPath(
      path,
      paint
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
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
