import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../data/models.dart';
import 'geometry.dart';

/// Village map (port of the web's VillageMap/VillageMapArt): one continuous snow ground made of the
/// plaza and the opened district plots, a fence along the outer edge, facilities and decoration,
/// houses facing their chosen direction, empty lots as a dashed outline + "+", closed districts as a
/// dashed outline with their name. Pan and pinch-zoom; taps resolve to a lot or a closed district.
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

  VillageGeometry get g => widget.geometry;

  /// World area drawn (every district, so panning never shows an edge).
  Rect get _world => g
      .fullView()
      .expandToInclude(g.lotsView(widget.village.openHalves))
      .inflate(tile * 2);

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

  /// Fit the opened village into the viewport (portrait: zoom in and crop the sides, like the web).
  void _fit(Size viewport) {
    final view = g.lotsView(widget.village.openHalves);
    final world = _world;
    var w = view.width;
    var h = view.height;
    final aspect = viewport.height / viewport.width;
    if (aspect > h / w) {
      w = math.max(w * 0.68, h / aspect);
      h = w * aspect;
    } else {
      w = h / aspect;
    }
    final scale = viewport.width / w;
    final cx = view.center.dx - world.left;
    final cy = view.center.dy - world.top + (h - view.height) * 0.05;
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
              origin: world.topLeft,
              snow: _snow,
            ),
          ),
        ),
      ),
    ];

    for (final e in g.mapOrder(v)) {
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
              ),
              asset: asset,
              key: ValueKey('f-${facility.id}'),
            ),
          );
        case LotEntity(:final lot):
          final c = w(project(lot.i, lot.j));
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
              g.placeSprite(view.sprite, lot.i, lot.j, houseTiles),
              mirror: view.mirror,
              key: ValueKey('h-${lot.slot}-${h.style.name}-${h.direction}'),
              fadeIn: widget.igniteSlot == lot.slot,
            ),
          );
        case FenceEntity(:final piece):
          if (piece.kind == 'post') {
            layers.add(
              sprite(
                g.parts.post,
                g.placeSprite(g.parts.post, piece.i, piece.j, 0.55),
              ),
            );
          } else {
            final name =
                piece.kind == 'gate' && g.sprites.containsKey(g.parts.gate)
                ? g.parts.gate
                : g.parts.fence;
            final (rect, shear) = _alongEdge(
              name,
              piece,
              piece.kind == 'gate' ? segTiles * 1.15 : segTiles,
            );
            layers.add(sprite(name, rect, mirror: piece.mirror, extra: shear));
          }
      }
    }

    // Ghost districts: name tag in the middle; locked second halves: lock mark.
    for (final d in g.districts) {
      if (!widget.interactive || districtState(open, d.index) != 0) continue;
      final c = w(project(d.i, d.j));
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
      final c = w(project(l.i, l.j));
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
      final c = w(project(lot.i, lot.j));
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
        final c = w(project(l.i, l.j));
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
        final c = w(project(d.i, d.j));
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

  /// A straight part laid along a ground edge, sheared so its base follows the true 2:1 slope (web: placeAlong).
  (Rect, Matrix4?) _alongEdge(String name, FencePiece piece, double tiles) {
    final s = g.sprites[name]!;
    final bw = s.bbox[2] - s.bbox[0];
    final width = (tiles * tile / 2) * 1.08 / bw;
    final height = width * s.aspect;
    final c = project(piece.i, piece.j);
    final cx = (s.bbox[0] + bw / 2) * width;
    final slope = s.baseSlope ?? 0.5;
    final baseMid = s.bbox[3] * height - slope * bw * width / 2;
    // Mirrored parts flip around the box centre, so the base point moves to (width - cx).
    final px = piece.mirror ? width - cx : cx;
    final rect = Rect.fromLTWH(c.dx - px, c.dy - baseMid, width, height);
    final k = 0.5 - slope;
    if (k.abs() < 0.01) return (rect, null);
    // Shear around the base point (local coords of the positioned box).
    final py = baseMid;
    final m = Matrix4.identity()
      ..translateByDouble(px, py, 0, 1)
      ..multiply(
        Matrix4(
          1,
          piece.mirror ? -k : k,
          0,
          0,
          0,
          1,
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
        ),
      )
      ..translateByDouble(-px, -py, 0, 1);
    return (rect, m);
  }
}

class _GroundPainter extends CustomPainter {
  _GroundPainter({
    required this.g,
    required this.village,
    required this.origin,
    required this.snow,
  });
  final VillageGeometry g;
  final Village village;
  final Offset origin;
  final ui.Image? snow;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.translate(-origin.dx, -origin.dy);
    final open = village.openHalves;
    Path poly(List<Offset> pts) => Path()..addPolygon(pts, true);

    // Faint field + ghost districts.
    final ghost = Paint()
      ..color = const Color(0x22FFFFFF)
      ..style = PaintingStyle.fill;
    final ghostLine = Paint()
      ..color = const Color(0xBFFFFFFF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    for (final d in g.districts) {
      if (districtState(open, d.index) != 0) continue;
      final p = poly(tileDiamond(d.i, d.j, g.plotTiles * 0.97));
      canvas.drawPath(p, ghost);
      _dashed(canvas, tileDiamond(d.i, d.j, g.plotTiles * 0.97), ghostLine);
    }

    // Bank on the outer edges that face the viewer.
    final edges = g.groundEdges(open);
    for (final e in edges.outer.where((e) => e.front)) {
      final a = project(e.a.dx, e.a.dy);
      final b = project(e.b.dx, e.b.dy);
      final top = math.min(a.dy, b.dy);
      final bank = Paint()
        ..shader = ui.Gradient.linear(
          Offset(0, top),
          Offset(0, math.max(a.dy, b.dy) + tile * 0.42),
          const [Color(0xFFC9D3E0), Color(0xFFB4A99B), Color(0xFF8E8376)],
          const [0, 0.35, 1],
        );
      canvas.drawPath(
        poly([
          a,
          b,
          b + const Offset(0, tile * 0.42),
          a + const Offset(0, tile * 0.42),
        ]),
        bank,
      );
    }

    // Snow ground: base colour + iso texture.
    final base = Paint()..color = const Color(0xFFEEF3F8);
    final cells = g.openCells(open);
    for (final c in cells) {
      canvas.drawPath(poly(g.cellDiamond(c, 0.04)), base);
    }
    if (snow != null) {
      const s = 3.0; // texture repeats every 3 tiles
      final px = snow!.width.toDouble();
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
      final tex = Paint()
        ..shader = ImageShader(snow!, TileMode.repeated, TileMode.repeated, m);
      tex.color = const Color(0xE6FFFFFF);
      for (final c in cells) {
        canvas.drawPath(poly(g.cellDiamond(c, 0.04)), tex);
      }
    }

    // Cobble paths between districts.
    final path = Paint()..color = const Color(0x8CCFC5B8);
    for (final e in edges.inner) {
      const w = 0.42;
      final off = e.axisI ? const Offset(0, w) : const Offset(w, 0);
      canvas.drawPath(
        poly([
          project(e.a.dx - off.dx, e.a.dy - off.dy),
          project(e.b.dx - off.dx, e.b.dy - off.dy),
          project(e.b.dx + off.dx, e.b.dy + off.dy),
          project(e.a.dx + off.dx, e.a.dy + off.dy),
        ]),
        path,
      );
    }

    // Empty lots: dashed outline; locked second halves: grey dashed outline.
    final taken = {for (final h in village.houses) h.slot};
    final lotFill = Paint()..color = const Color(0x73FFFFFF);
    final lotLine = Paint()
      ..color = const Color(0xFF708B82)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    final lockLine = Paint()
      ..color = const Color(0xFF7D8CA6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    for (final l in g.lots) {
      final opened = isHalfOpen(open, l.slot);
      final halfLocked = l.half == 1 && districtState(open, l.district) == 1;
      if ((opened && !taken.contains(l.slot)) || halfLocked) {
        final d = tileDiamond(l.i, l.j, houseTiles * 0.62);
        canvas.drawPath(poly(d), lotFill);
        _dashed(canvas, d, halfLocked ? lockLine : lotLine);
      }
    }
  }

  void _dashed(Canvas canvas, List<Offset> pts, Paint paint) {
    const dash = 9.0;
    const gap = 8.0;
    for (var k = 0; k < pts.length; k++) {
      final a = pts[k];
      final b = pts[(k + 1) % pts.length];
      final len = (b - a).distance;
      final dir = (b - a) / len;
      for (var t = 0.0; t < len; t += dash + gap) {
        canvas.drawLine(a + dir * t, a + dir * math.min(t + dash, len), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _GroundPainter old) =>
      old.village != village || old.snow != snow || old.origin != origin;
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
