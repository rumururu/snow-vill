import 'package:flutter/material.dart';

import '../data/models.dart';
import 'geometry.dart';

/// Village scene: background + houses + tree in painter's order (1024×1024 world scaled to
/// the available width). Taps resolve to the front-most house whose silhouette contains the
/// point — the same rule as the web's clip-path buttons.
class VillageSceneView extends StatelessWidget {
  const VillageSceneView({
    super.key,
    required this.geometry,
    required this.village,
    this.myHouseId,
    this.igniteSlot,
    this.onSlotTap,
    this.slotLabel,
  });

  final SceneGeometry geometry;
  final Village village;
  final String? myHouseId;
  final int? igniteSlot;
  final void Function(int slot)? onSlotTap;

  /// Accessibility label per slot (null → decorative scene).
  final String Function(int slot, House? house)? slotLabel;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    return AspectRatio(
      aspectRatio: 1,
      child: LayoutBuilder(builder: (context, c) {
        final scale = c.maxWidth / worldSize;
        Rect s(Rect r) => Rect.fromLTWH(r.left * scale, r.top * scale, r.width * scale, r.height * scale);

        Widget sprite(String name, Offset ground, double tile, {bool fadeIn = false}) {
          final g = geometry.sprites[name]!;
          final r = s(g.rectAt(ground, tile));
          final image = Image.asset(g.asset, width: r.width, height: r.height, fit: BoxFit.fill, filterQuality: FilterQuality.medium);
          return Positioned.fromRect(
            rect: r,
            child: fadeIn && !reduceMotion
                ? TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOut,
                    builder: (_, v, child) => Opacity(opacity: v, child: child),
                    child: image,
                  )
                : image,
          );
        }

        final layers = <Widget>[
          Positioned.fill(child: Image.asset(geometry.background, fit: BoxFit.fill, filterQuality: FilterQuality.medium)),
        ];
        for (final e in geometry.renderOrder()) {
          switch (e) {
            case TreeEntity():
              layers.add(sprite(village.isFull ? 'tree_complete' : 'tree_base', geometry.treeAnchor, geometry.treeTileWorld));
            case HouseEntity(:final slot):
              final def = geometry.slots[slot];
              final house = village.houseAt(slot);
              final igniting = house != null && igniteSlot == slot;
              if (house == null || igniting) layers.add(sprite('house_empty', def.anchor, geometry.tileWorld));
              if (house != null) {
                layers.add(sprite(geometry.houseSprite(house.style), def.anchor, geometry.tileWorld, fadeIn: igniting));
              }
          }
        }

        // Labels on each roof (never covered by houses in front, never over the tree).
        // Decorative scenes (no onSlotTap) have no labels, like the web.
        for (final def in onSlotTap == null ? const <SlotDef>[] : geometry.slots) {
          final house = village.houseAt(def.slot);
          final pos = Offset(def.anchor.dx * scale, (def.hit.top + def.hit.height * 0.24) * scale);
          layers.add(Positioned(
            left: pos.dx - 60,
            top: pos.dy - 11,
            width: 120,
            height: 22,
            child: IgnorePointer(
              child: Center(
                child: house == null
                    ? Container(
                        width: 20,
                        height: 20,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xE6F6F0E4),
                          shape: BoxShape.circle,
                          boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 3)],
                        ),
                        child: const Text('+', style: TextStyle(fontSize: 14, height: 1, fontWeight: FontWeight.w800, color: Color(0xFF708B82))),
                      )
                    : _NameChip(text: house.nickname, mine: house.id == myHouseId),
              ),
            ),
          ));
        }

        if (onSlotTap != null) {
          layers.add(Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapUp: (d) {
                final slot = geometry.slotAt(d.localPosition / scale);
                if (slot != null) onSlotTap!(slot);
              },
            ),
          ));
          // Accessibility nodes (screen readers, Marionette); pointer taps fall through to the
          // gesture layer above because these boxes are not hit-testable.
          for (final def in geometry.slots) {
            final house = village.houseAt(def.slot);
            layers.add(Positioned.fromRect(
              rect: s(def.hit),
              child: Semantics(
                key: ValueKey('slot-${def.slot}'),
                button: true,
                label: slotLabel?.call(def.slot, house),
                onTap: () => onSlotTap!(def.slot),
                child: const SizedBox.expand(),
              ),
            ));
          }
        }

        return ClipRRect(borderRadius: BorderRadius.circular(24), child: Stack(children: layers));
      }),
    );
  }
}

class _NameChip extends StatelessWidget {
  const _NameChip({required this.text, required this.mine});
  final String text;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 110),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: mine ? const Color(0xFF404F70) : const Color(0xF2F6F0E4),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [BoxShadow(color: Color(0x26000000), blurRadius: 3)],
      ),
      child: Text(
        mine ? '★ $text' : text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: mine ? const Color(0xFFF6F0E4) : const Color(0xFF404F70)),
      ),
    );
  }
}
