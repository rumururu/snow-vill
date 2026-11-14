import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:purchases_flutter/purchases_flutter.dart' show Package;
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../data/photo.dart';
import '../data/purchase_service.dart';
import '../data/validation.dart';
import '../l10n/app_localizations.dart';
import '../scene/geometry.dart' as geo;
import '../scene/village_scene.dart';
import '../state/providers.dart';
import '../ui/common.dart';
import 'account_sheet.dart';

/// Claim draft kept on the screen so it survives closing the sheet and failed submits.
class _Draft {
  String nickname = '';
  HouseStyle style = HouseStyle.brick;
  int direction = 0;
  int? directionFor; // lot the direction default was taken from
  String message = '';
  Uint8List? photo;
  void reset() {
    nickname = '';
    style = HouseStyle.brick;
    direction = 0;
    directionFor = null;
    message = '';
    photo = null;
  }
}

/// House type label from the shared geometry (10 languages, English fallback).
String styleName(BuildContext context, geo.VillageGeometry? g, HouseStyle s) {
  final lang = Localizations.localeOf(context).languageCode;
  return g?.houseLabel(s, lang) ?? s.name;
}

class VillageScreen extends ConsumerStatefulWidget {
  const VillageScreen({super.key, required this.villageId, this.isNew = false});
  final String villageId;
  final bool isNew;

  @override
  ConsumerState<VillageScreen> createState() => _VillageScreenState();
}

class _VillageScreenState extends ConsumerState<VillageScreen> {
  final _draft = _Draft();
  int? _ignite;
  bool _firstPromptShown = false;

  /// Village look being edited (owner): draft path style + moved decorations; null = not editing.
  ({PathStyle pathStyle, Map<String, Offset> decor})? _look;
  bool _savingLook = false;

  void _startLook(Village v) =>
      setState(() => _look = (pathStyle: v.pathStyle, decor: {...v.decor}));

  Future<void> _saveLook() async {
    final look = _look;
    if (look == null) return;
    setState(() => _savingLook = true);
    final r = await _notifier.setLook(look.pathStyle, look.decor);
    if (!mounted) return;
    setState(() => _savingLook = false);
    final l = AppLocalizations.of(context);
    if (!r.ok) {
      showToast(context, trKey(l, r.error!));
      return;
    }
    setState(() => _look = null);
    showToast(context, l.lookSaved);
  }

  VillageNotifier get _notifier =>
      ref.read(villageProvider(widget.villageId).notifier);

  String _styleLabel(AppLocalizations l, HouseStyle s) =>
      styleName(context, ref.read(villageGeometryProvider).value, s);

  void _onSlot(Village v, int slot) {
    final l = AppLocalizations.of(context);
    final house = v.houseAt(slot);
    if (house != null) {
      _openFrame(v, house);
      return;
    }
    if (v.lockedSlots.contains(slot)) {
      _openUpgrade(v, district: slot ~/ 6);
      return;
    }
    final mine = myHouseIdIn(ref.read(identityProvider), v);
    if (mine != null && v.houses.any((h) => h.id == mine)) {
      showToast(context, l.alreadyHaveHouse);
      return;
    }
    _openClaim(v, slot);
  }

  Future<void> _openClaim(Village v, int slot, {bool intro = false}) async {
    final result = await showModalBottomSheet<Object>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ClaimSheet(
        villageId: v.id,
        slot: slot,
        draft: _draft,
        intro: intro,
        styleLabel: _styleLabel,
      ),
    );
    if (!mounted || result == null) return;
    final l = AppLocalizations.of(context);
    if (result is int) {
      // Collision: move to another free lot with the same draft.
      final latest = ref.read(villageProvider(widget.villageId)).value;
      if (latest != null) _openClaim(latest, result);
      return;
    }
    final r = result as ({House house, String? photoError});
    _draft.reset();
    setState(() => _ignite = r.house.slot);
    Timer(
      const Duration(milliseconds: 1200),
      () => mounted ? setState(() => _ignite = null) : null,
    );
    showToast(
      context,
      r.photoError != null
          ? l.photoFailedAfterClaim
          : l.litUp(r.house.nickname),
    );
  }

  Future<void> _openFrame(Village v, House house) async {
    final identity = ref.read(identityProvider);
    final removed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _FrameSheet(
        villageId: v.id,
        house: house,
        isMine: myHouseIdIn(identity, v) == house.id,
        isOwner: isOwnerOf(identity, v),
        styleLabel: _styleLabel,
      ),
    );
    if (removed == true && mounted) {
      showToast(
        context,
        AppLocalizations.of(context).houseRemoved(house.nickname),
      );
    }
  }

  Future<void> _openInvite(Village v) async {
    final l = AppLocalizations.of(context);
    final url = inviteUrl(v.id);
    await showModalBottomSheet<void>(
      context: context,
      builder: (c) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l.inviteTitle,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: SvColors.night,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l.inviteBody(v.remaining),
              style: const TextStyle(color: SvColors.night),
            ),
            const SizedBox(height: 12),
            SelectableText(
              url,
              style: const TextStyle(fontSize: 13, color: SvColors.night),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const ValueKey('share-invite'),
              onPressed: () => SharePlus.instance.share(
                ShareParams(text: l.shareText(url), subject: v.name),
              ),
              child: Text(l.shareLink),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (c.mounted) showToast(c, l.linkCopied);
              },
              child: Text(l.copyLink),
            ),
            const SizedBox(height: 12),
            Text(
              l.inviteNote,
              style: TextStyle(
                fontSize: 12,
                height: 1.5,
                color: SvColors.night.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openUpgrade(Village v, {int? district}) async {
    final g = ref.read(villageGeometryProvider).value;
    if (g == null) return;
    final opened = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          _UpgradeSheet(village: v, geometry: g, district: district),
    );
    if (opened != null && mounted) {
      final lang = Localizations.localeOf(context).languageCode;
      final d = g.districts[opened];
      showToast(
        context,
        AppLocalizations.of(context).districtOpened(d.name(lang)),
      );
    }
  }

  /// The aurora is the only reward left that depends on the number of houses (facilities come with districts).
  ({int remaining, String reward})? _nextMilestone(
    AppLocalizations l,
    geo.VillageGeometry g,
    Village v,
  ) {
    final n = g.auroraMinHouses;
    if (n > v.houses.length && n <= v.capacity) {
      return (remaining: n - v.houses.length, reward: l.decorAurora);
    }
    return null;
  }

  bool _joining = false;

  /// Locked private village: sign in if needed, then ask the owner with a nickname.
  Future<void> _requestJoin() async {
    final l = AppLocalizations.of(context);
    setState(() => _joining = true);
    try {
      if (!await showSignInSheet(context, ref) || !mounted) return;
      await _notifier.refresh(silent: true);
      final v = ref.read(villageProvider(widget.villageId)).value;
      if (!mounted || v == null || !v.locked || v.myRole == 'pending') return;
      final nickname = await _askNickname();
      if (nickname == null || !mounted) return;
      final r = await _notifier.requestJoin(nickname);
      if (mounted && !r.ok) showToast(context, trKey(l, r.error!));
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  Future<String?> _askNickname() {
    final l = AppLocalizations.of(context);
    final controller = TextEditingController();
    String? error;
    return showDialog<String>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, setState) => AlertDialog(
          title: Text(l.requestJoin),
          content: TextField(
            key: const ValueKey('join-nickname'),
            controller: controller,
            autofocus: true,
            decoration: InputDecoration(
              labelText: l.nickname,
              hintText: l.nicknameHint,
              errorText: error,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: Text(l.cancel),
            ),
            FilledButton(
              key: const ValueKey('join-submit'),
              style: FilledButton.styleFrom(minimumSize: const Size(88, 44)),
              onPressed: () {
                final e = nicknameError(controller.text);
                if (e != null) {
                  setState(() => error = trKey(l, e));
                } else {
                  Navigator.pop(c, controller.text);
                }
              },
              child: Text(l.requestJoin),
            ),
          ],
        ),
      ),
    );
  }

  /// Owner: public ⇄ private. Private villages need a signed-in owner (members are accounts).
  Future<void> _togglePrivate(Village v) async {
    final l = AppLocalizations.of(context);
    if (!await showSignInSheet(context, ref) || !mounted) return;
    final r = await _notifier.setPrivate(!v.isPrivate);
    if (mounted && !r.ok) showToast(context, trKey(l, r.error!));
  }

  Future<void> _openMembers(Village v) async {
    ref.invalidate(membersProvider(v.id));
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MembersSheet(villageId: v.id),
    );
  }

  Future<void> _confirmDelete(Village v) async {
    final l = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(l.deleteConfirmTitle),
        content: Text(l.deleteConfirmBody(v.houses.length)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text(l.cancel),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: SvColors.danger),
            onPressed: () => Navigator.pop(c, true),
            child: Text(l.deleteButton),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final r = await _notifier.deleteVillage();
    if (!mounted) return;
    if (!r.ok) {
      showToast(context, trKey(l, r.error!));
      return;
    }
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final async = ref.watch(villageProvider(widget.villageId));
    final geometry = ref.watch(villageGeometryProvider).value;
    final identity = ref.watch(identityProvider);
    final session = ref.watch(sessionProvider);
    final village = async.value;
    final owner = village != null && isOwnerOf(identity, village);
    // Join requests waiting (signed-in owner of a private village).
    final pending = owner && village.isPrivate && session != null
        ? (ref
                  .watch(membersProvider(village.id))
                  .value
                  ?.where((m) => !m.approved)
                  .length ??
              0)
        : 0;

    if (village != null &&
        geometry != null &&
        widget.isNew &&
        !_firstPromptShown) {
      _firstPromptShown = true;
      if (village.houseAt(0) == null &&
          myHouseIdIn(identity, village) == null) {
        WidgetsBinding.instance.addPostFrameCallback(
          (_) => mounted ? _openClaim(village, 0, intro: true) : null,
        );
      }
    }

    Widget body;
    if (village == null && async.isLoading || geometry == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (village == null && async.hasError) {
      body = _Message(
        icon: '📡',
        title: l.loadFailed,
        action: FilledButton(
          onPressed: () => _notifier.refresh(),
          child: Text(l.retry),
        ),
      );
    } else if (village == null) {
      body = _Message(
        icon: '🌨️',
        title: l.notFoundTitle,
        body: l.notFoundBody,
      );
    } else if (village.locked) {
      body = _Message(
        key: const ValueKey('locked-village'),
        icon: '🔒',
        title: l.privateVillage,
        action: village.myRole == 'pending'
            ? Text(
                l.joinPending,
                key: const ValueKey('join-pending'),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: SvColors.night,
                ),
              )
            : FilledButton(
                key: const ValueKey('request-join'),
                onPressed: _joining ? null : () => _requestJoin(),
                child: Text(l.requestJoin),
              ),
      );
    } else {
      final myHouseId = myHouseIdIn(identity, village);
      final myHouse = village.houses
          .where((h) => h.id == myHouseId)
          .firstOrNull;
      final lang = Localizations.localeOf(context).languageCode;
      body = Padding(
        padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      l.occupancy(village.houses.length, village.capacity),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: SvColors.night,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      village.isFull
                          ? l.villageComplete
                          : l.freeHouses(village.remaining),
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: SvColors.night.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                  if (isOwnerOf(identity, village) && _look == null)
                    ActionChip(
                      key: const ValueKey('edit-look'),
                      label: Text(l.editLook),
                      onPressed: () => _startLook(village),
                      backgroundColor: Colors.white,
                      side: BorderSide.none,
                      shape: const StadiumBorder(),
                    ),
                ],
              ),
            ),
            if (_nextMilestone(l, geometry, village) case final m?) ...[
              const SizedBox(height: 8),
              Container(
                key: const ValueKey('milestone'),
                margin: const EdgeInsets.symmetric(horizontal: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: SvColors.glow.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  l.milestoneHint(m.remaining, m.reward),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: SvColors.night,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Expanded(
              child: VillageMapView(
                key: const ValueKey('village-scene'),
                geometry: geometry,
                village: village,
                myHouseId: myHouseId,
                igniteSlot: _ignite,
                onSlotTap: (slot) => _onSlot(village, slot),
                onDistrictTap: (d) => _openUpgrade(village, district: d),
                slotLabel: (slot, h) => h != null
                    ? l.frameTitle(h.nickname)
                    : '${slot + 1} · ${l.makeMyHouse}',
                districtLabel: (d) =>
                    l.lockedDistrict(geometry.districts[d].name(lang)),
                edit: switch (_look) {
                  final look? => LookEdit(
                    pathStyle: look.pathStyle,
                    decor: look.decor,
                    onMove: (id, at) => setState(
                      () => _look = (
                        pathStyle: look.pathStyle,
                        decor: {...look.decor, id: at},
                      ),
                    ),
                  ),
                  null => null,
                },
              ),
            ),
            if (_look case final look?) ...[
              const SizedBox(height: 8),
              _LookPanel(
                pathStyle: look.pathStyle,
                moved: look.decor.length,
                saving: _savingLook,
                onPathStyle: (ps) =>
                    setState(() => _look = (pathStyle: ps, decor: look.decor)),
                onResetDecor: () => setState(
                  () => _look = (pathStyle: look.pathStyle, decor: const {}),
                ),
                onCancel: () => setState(() => _look = null),
                onSave: _saveLook,
              ),
            ] else ...[
              const SizedBox(height: 8),
              if (async.hasError)
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: ErrorBox(l.errNetwork),
                ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    if (!village.isFull)
                      Expanded(
                        child: myHouse != null
                            ? OutlinedButton(
                                onPressed: () => _openFrame(village, myHouse),
                                child: Text(
                                  l.myHouse,
                                  textAlign: TextAlign.center,
                                ),
                              )
                            : FilledButton(
                                key: const ValueKey('make-house'),
                                onPressed: () => _openClaim(
                                  village,
                                  village.freeSlots.first,
                                ),
                                child: Text(
                                  l.makeMyHouse,
                                  textAlign: TextAlign.center,
                                ),
                              ),
                      ),
                    if (village.isFull && village.canUpgrade)
                      Expanded(
                        child: FilledButton(
                          key: const ValueKey('grow-big'),
                          style: FilledButton.styleFrom(
                            backgroundColor: SvColors.glow,
                            foregroundColor: SvColors.night,
                          ),
                          onPressed: () => _openUpgrade(village),
                          child: Text(l.growBig, textAlign: TextAlign.center),
                        ),
                      ),
                    if (!village.isFull || village.canUpgrade)
                      const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        key: const ValueKey('invite'),
                        onPressed: () => _openInvite(village),
                        child: Text(l.invite, textAlign: TextAlign.center),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: SvColors.sky,
        title: Text(
          village?.name ?? '',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: SvColors.night,
          ),
        ),
        centerTitle: true,
        actions: [
          if (village != null && !village.locked)
            PopupMenuButton<String>(
              key: const ValueKey('village-menu'),
              icon: Badge(
                isLabelVisible: pending > 0,
                label: Text('$pending'),
                backgroundColor: SvColors.danger,
                child: const Icon(Icons.more_vert),
              ),
              onSelected: (v) => switch (v) {
                'grow' => _openUpgrade(village),
                'look' => _startLook(village),
                'private' => _togglePrivate(village),
                'members' => _openMembers(village),
                _ => _confirmDelete(village),
              },
              itemBuilder: (_) => [
                if (owner && _look == null)
                  PopupMenuItem(value: 'look', child: Text(l.editLookMenu)),
                if (owner && signInAvailable(ref))
                  CheckedPopupMenuItem(
                    key: const ValueKey('menu-private'),
                    value: 'private',
                    checked: village.isPrivate,
                    child: Text(l.privateVillage),
                  ),
                if (owner && village.isPrivate && session != null)
                  PopupMenuItem(
                    key: const ValueKey('menu-members'),
                    value: 'members',
                    child: Row(
                      children: [
                        Text(l.members),
                        if (pending > 0) ...[
                          const SizedBox(width: 8),
                          Badge(
                            label: Text('$pending'),
                            backgroundColor: SvColors.danger,
                          ),
                        ],
                      ],
                    ),
                  ),
                // Always reachable (not only at 6/6) so anyone — including app reviewers — can buy it.
                if (village.canUpgrade)
                  PopupMenuItem(
                    key: const ValueKey('menu-grow'),
                    value: 'grow',
                    child: Text(l.growBig),
                  ),
                if (owner)
                  PopupMenuItem(value: 'delete', child: Text(l.deleteVillage)),
              ],
            ),
        ],
      ),
      body: SafeArea(child: body),
    );
  }
}

/// Owner's look editor (replaces the bottom actions while editing): path style, reset, cancel / save.
/// Mirrors `LookEditor` in VillageView.tsx.
class _LookPanel extends StatelessWidget {
  const _LookPanel({
    required this.pathStyle,
    required this.moved,
    required this.saving,
    required this.onPathStyle,
    required this.onResetDecor,
    required this.onCancel,
    required this.onSave,
  });
  final PathStyle pathStyle;
  final int moved;
  final bool saving;
  final ValueChanged<PathStyle> onPathStyle;
  final VoidCallback onResetDecor;
  final VoidCallback onCancel;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    String label(PathStyle p) => switch (p) {
      PathStyle.dirt => l.pathDirt,
      PathStyle.stones => l.pathStones,
      PathStyle.brick => l.pathBrick,
      PathStyle.snow => l.pathSnow,
    };
    return Padding(
      key: const ValueKey('look-panel'),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                l.pathStyleTitle,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: SvColors.night,
                ),
              ),
              const Spacer(),
              TextButton(
                key: const ValueKey('reset-decor'),
                onPressed: moved == 0 ? null : onResetDecor,
                child: Text(l.resetDecor),
              ),
            ],
          ),
          Row(
            children: [
              for (final p in PathStyle.values) ...[
                if (p != PathStyle.values.first) const SizedBox(width: 6),
                Expanded(
                  child: Semantics(
                    selected: pathStyle == p,
                    child: ChoiceChip(
                      key: ValueKey('path-${p.name}'),
                      label: SizedBox(
                        width: double.infinity,
                        child: Text(label(p), textAlign: TextAlign.center),
                      ),
                      selected: pathStyle == p,
                      showCheckmark: false,
                      onSelected: (_) => onPathStyle(p),
                      selectedColor: SvColors.night,
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: pathStyle == p ? SvColors.ivory : SvColors.night,
                      ),
                      side: BorderSide.none,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            l.lookHint,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: SvColors.night.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  key: const ValueKey('look-cancel'),
                  onPressed: saving ? null : onCancel,
                  child: Text(l.cancel),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  key: const ValueKey('look-save'),
                  onPressed: saving ? null : onSave,
                  child: Text(saving ? l.savingLook : l.saveLook),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.action,
  });
  final String icon;
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(icon, style: const TextStyle(fontSize: 44)),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: SvColors.night,
            ),
          ),
          if (body != null) ...[
            const SizedBox(height: 8),
            Text(
              body!,
              textAlign: TextAlign.center,
              style: TextStyle(color: SvColors.night.withValues(alpha: 0.7)),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    ),
  );
}

// ---------------------------------------------------------------- claim sheet

class _ClaimSheet extends ConsumerStatefulWidget {
  const _ClaimSheet({
    required this.villageId,
    required this.slot,
    required this.draft,
    required this.intro,
    required this.styleLabel,
  });
  final String villageId;
  final int slot;
  final _Draft draft;
  final bool intro;
  final String Function(AppLocalizations, HouseStyle) styleLabel;

  @override
  ConsumerState<_ClaimSheet> createState() => _ClaimSheetState();
}

class _ClaimSheetState extends ConsumerState<_ClaimSheet> {
  late final _nick = TextEditingController(text: widget.draft.nickname);
  late final _msg = TextEditingController(text: widget.draft.message);
  String? _nickError;
  String? _msgError;
  String? _submitError;
  int? _moveTo;
  bool _busy = false;
  bool _photoBusy = false;

  Future<void> _pickPhoto() async {
    setState(() => _photoBusy = true);
    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
      );
      if (file == null) return;
      widget.draft.photo = await preparePhoto(await file.readAsBytes());
      _submitError = null;
    } on PhotoException catch (e) {
      if (mounted) {
        _submitError = trKey(
          AppLocalizations.of(context),
          e.code == 'tooLarge' ? 'errPhotoTooLarge' : 'errPhotoUnsupported',
        );
      }
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _submit() async {
    final l = AppLocalizations.of(context);
    widget.draft
      ..nickname = _nick.text
      ..message = _msg.text;
    final nErr = nicknameError(_nick.text);
    final mErr = messageError(_msg.text);
    setState(() {
      _nickError = nErr == null ? null : trKey(l, nErr);
      _msgError = mErr == null ? null : trKey(l, mErr);
      _submitError = null;
      _moveTo = null;
    });
    if (nErr != null || mErr != null) return;
    setState(() => _busy = true);
    final r = await ref
        .read(villageProvider(widget.villageId).notifier)
        .claim(
          widget.slot,
          nickname: _nick.text,
          style: widget.draft.style,
          direction: widget.draft.direction,
          message: _msg.text,
          photo: widget.draft.photo,
        );
    if (!mounted) return;
    setState(() => _busy = false);
    if (r.ok) {
      Navigator.pop(context, r.value);
      return;
    }
    final free =
        ref
            .read(villageProvider(widget.villageId))
            .value
            ?.freeSlots
            .where((s) => s != widget.slot)
            .toList() ??
        [];
    setState(() {
      _submitError = trKey(l, r.error!);
      _moveTo = r.error == 'errSlotTaken' && free.isNotEmpty
          ? free.first
          : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final geometry = ref.watch(villageGeometryProvider).value;
    final d = widget.draft;
    // New lot → the door faces the district's centre by default (the friend can change it).
    if (geometry != null && d.directionFor != widget.slot) {
      d.directionFor = widget.slot;
      d.direction = geometry.lots[widget.slot].facing;
    }
    Widget houseImage(HouseStyle style, int direction, double height) {
      final v = geometry!.houseView(style, direction);
      final img = Image.asset(
        geometry.sprites[v.sprite]!.asset,
        height: height,
        fit: BoxFit.contain,
      );
      return v.mirror ? Transform.flip(flipX: true, child: img) : img;
    }

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              children: [
                Text(
                  l.claimTitle(widget.slot + 1),
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: SvColors.night,
                  ),
                ),
                if (widget.intro) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: SvColors.glow.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      l.firstHouseIntro,
                      style: const TextStyle(color: SvColors.night),
                    ),
                  ),
                ],
                if (geometry != null)
                  Center(child: houseImage(d.style, d.direction, 130)),
                TextField(
                  key: const ValueKey('nickname'),
                  controller: _nick,
                  autofocus: true,
                  onChanged: (v) => d.nickname = v,
                  decoration: InputDecoration(
                    labelText: '${l.nickname} *',
                    hintText: l.nicknameHint,
                    errorText: _nickError,
                    counterText: '${charLength(_nick.text)}/$nicknameMax',
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  l.houseStyle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: SvColors.night,
                  ),
                ),
                const SizedBox(height: 8),
                if (geometry != null)
                  LayoutBuilder(
                    builder: (context, c) {
                      // Icon grows with the tile (tablets) and the tile is only as tall as its content.
                      final icon = ((c.maxWidth - 16) / 3 * 0.55).clamp(
                        54.0,
                        96.0,
                      );
                      return GridView(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          mainAxisExtent: icon + 38,
                        ),
                        children: [
                          for (final s in pickerStyles)
                            _PickTile(
                              key: ValueKey('style-${s.name}'),
                              selected: d.style == s,
                              label: widget.styleLabel(l, s),
                              onTap: () => setState(() => d.style = s),
                              child: houseImage(s, 0, icon),
                            ),
                        ],
                      );
                    },
                  ),
                const SizedBox(height: 14),
                Text(
                  l.doorDirection,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: SvColors.night,
                  ),
                ),
                const SizedBox(height: 8),
                if (geometry != null)
                  Row(
                    children: [
                      for (final dir in [0, 1, 2, 3]) ...[
                        if (dir > 0) const SizedBox(width: 8),
                        Expanded(
                          child: _PickTile(
                            key: ValueKey('direction-$dir'),
                            selected: d.direction == dir,
                            label: [
                              l.dirFrontLeft,
                              l.dirFrontRight,
                              l.dirBackRight,
                              l.dirBackLeft,
                            ][dir],
                            note: geometry.lots[widget.slot].facing == dir
                                ? l.dirTowardCentre
                                : null,
                            onTap: () => setState(() => d.direction = dir),
                            child: houseImage(d.style, dir, 44),
                          ),
                        ),
                      ],
                    ],
                  ),
                const SizedBox(height: 16),
                Text(
                  '${l.photo} ${l.optional}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: SvColors.night,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 72,
                        height: 72,
                        child: d.photo != null
                            ? Image.memory(d.photo!, fit: BoxFit.cover)
                            : Container(
                                color: SvColors.sky,
                                child: const Icon(
                                  Icons.photo_outlined,
                                  color: SvColors.sage,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          OutlinedButton(
                            key: const ValueKey('pick-photo'),
                            onPressed: _photoBusy ? null : _pickPhoto,
                            child: Text(
                              _photoBusy
                                  ? '…'
                                  : (d.photo != null
                                        ? l.changePhoto
                                        : l.choosePhoto),
                            ),
                          ),
                          if (d.photo != null)
                            TextButton(
                              onPressed: () => setState(() => d.photo = null),
                              child: Text(l.removePhoto),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  key: const ValueKey('message'),
                  controller: _msg,
                  maxLines: 2,
                  onChanged: (v) => setState(() => d.message = v),
                  decoration: InputDecoration(
                    labelText: '${l.message} ${l.optional}',
                    hintText: l.messageHint,
                    errorText: _msgError,
                    counterText: '${charLength(_msg.text)}/$messageMax',
                  ),
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(
                    children: [
                      if (ref.watch(villageProvider(widget.villageId)).value?.isPrivate != true)
                        TextSpan(text: '${l.visibilityNote} '),
                      WidgetSpan(
                        child: GestureDetector(
                          onTap: () => launchUrl(
                            Uri.parse('$webBase/privacy/'),
                            mode: LaunchMode.externalApplication,
                          ),
                          child: Text(
                            l.privacyPolicy,
                            style: const TextStyle(
                              fontSize: 12,
                              decoration: TextDecoration.underline,
                              color: SvColors.night,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.5,
                    color: SvColors.night.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
          // Sticky footer: errors stay on screen next to the button (no scrolling needed).
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_submitError != null) ...[
                  ErrorBox(
                    _submitError!,
                    action: _moveTo == null
                        ? null
                        : OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 44),
                            ),
                            onPressed: () => Navigator.pop(context, _moveTo),
                            child: Text(l.moveToSlot(_moveTo! + 1)),
                          ),
                  ),
                  const SizedBox(height: 10),
                ],
                FilledButton(
                  key: const ValueKey('submit-house'),
                  onPressed: _busy || _photoBusy ? null : _submit,
                  child: Text(_busy ? l.submitting : l.submitHouse),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Selectable tile (house type / door direction) with a picture and a label.
class _PickTile extends StatelessWidget {
  const _PickTile({
    super.key,
    required this.selected,
    required this.label,
    required this.onTap,
    required this.child,
    this.note,
  });
  final bool selected;
  final String label;
  final String? note;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: label,
    child: Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: selected ? SvColors.night : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              child,
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: SvColors.night,
                ),
              ),
              if (note != null)
                Text(
                  note!,
                  style: const TextStyle(fontSize: 10, color: SvColors.sage),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- photo frame sheet

class _FrameSheet extends ConsumerStatefulWidget {
  const _FrameSheet({
    required this.villageId,
    required this.house,
    required this.isMine,
    required this.isOwner,
    required this.styleLabel,
  });
  final String villageId;
  final House house;
  final bool isMine;
  final bool isOwner;
  final String Function(AppLocalizations, HouseStyle) styleLabel;

  @override
  ConsumerState<_FrameSheet> createState() => _FrameSheetState();
}

class _FrameSheetState extends ConsumerState<_FrameSheet> {
  Future<String>? _url;
  late bool _hasPhoto = widget.house.hasPhoto;
  bool _confirm = false;
  bool _busy = false;
  String? _notice;
  String? _error;

  VillageNotifier get _n =>
      ref.read(villageProvider(widget.villageId).notifier);

  @override
  void initState() {
    super.initState();
    if (_hasPhoto) _url = _n.photoUrl(widget.house.id);
  }

  Future<void> _changePhoto() async {
    final l = AppLocalizations.of(context);
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      maxHeight: 2048,
    );
    if (file == null) return;
    setState(() => _busy = true);
    try {
      final jpeg = await preparePhoto(await file.readAsBytes());
      final r = await _n.uploadPhoto(widget.house.id, jpeg);
      if (!mounted) return;
      setState(() {
        if (r.ok) {
          _hasPhoto = true;
          _url = _n.photoUrl(widget.house.id);
          _error = null;
        } else {
          _error = trKey(l, r.error!);
        }
      });
    } on PhotoException catch (e) {
      if (mounted) {
        setState(
          () => _error = trKey(
            l,
            e.code == 'tooLarge' ? 'errPhotoTooLarge' : 'errPhotoUnsupported',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final h = widget.house;
    final date = DateFormat.yMMMd(
      Localizations.localeOf(context).toLanguageTag(),
    ).format(h.createdAt.toLocal());
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l.frameTitle(h.nickname),
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: SvColors.night,
            ),
          ),
          const SizedBox(height: 14),
          Center(
            child: Container(
              width: 300,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SvColors.wood,
                borderRadius: BorderRadius.circular(28),
              ),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8EA),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: !_hasPhoto
                        ? Container(
                            color: SvColors.sky,
                            child: const Center(
                              child: Text('⛄', style: TextStyle(fontSize: 96)),
                            ),
                          )
                        : FutureBuilder<String>(
                            future: _url,
                            builder: (c, s) => s.hasError
                                ? Center(
                                    child: TextButton(
                                      onPressed: () => setState(
                                        () => _url = _n.photoUrl(h.id),
                                      ),
                                      child: Text(l.photoLoadFailed),
                                    ),
                                  )
                                : !s.hasData
                                ? const Center(
                                    child: CircularProgressIndicator(),
                                  )
                                : Image.network(
                                    s.data!,
                                    key: const ValueKey('frame-photo'),
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) =>
                                        Center(child: Text(l.photoLoadFailed)),
                                  ),
                          ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            h.message.isEmpty ? l.noMessage : '“${h.message}”',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              height: 1.5,
              color: SvColors.night,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${widget.styleLabel(l, h.style)} · ${l.joinedOn(date)}',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: SvColors.night.withValues(alpha: 0.6),
            ),
          ),
          const Divider(height: 32),
          if (widget.isMine)
            OutlinedButton(
              onPressed: _busy ? null : _changePhoto,
              child: Text(_hasPhoto ? l.changePhoto : l.addPhoto),
            ),
          if (_error != null) ...[const SizedBox(height: 8), ErrorBox(_error!)],
          if (_notice != null) ...[
            const SizedBox(height: 8),
            Text(_notice!, textAlign: TextAlign.center),
          ],
          if (!widget.isMine && _notice == null)
            TextButton(
              onPressed: _busy
                  ? null
                  : () async {
                      setState(() => _busy = true);
                      final r = await _n.report(h.id);
                      if (!mounted) return;
                      setState(() {
                        _busy = false;
                        _notice = r.ok ? l.reported : trKey(l, r.error!);
                      });
                    },
              child: Text(l.report),
            ),
          if (widget.isMine || widget.isOwner)
            _confirm
                ? ErrorBox(
                    l.removeConfirm,
                    action: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setState(() => _confirm = false),
                            child: Text(l.cancel),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: SvColors.danger,
                            ),
                            onPressed: _busy
                                ? null
                                : () async {
                                    setState(() => _busy = true);
                                    final r = await _n.removeHouse(h.id);
                                    if (!mounted) return;
                                    if (r.ok) {
                                      Navigator.pop(this.context, true);
                                    } else {
                                      setState(() {
                                        _busy = false;
                                        _error = trKey(l, r.error!);
                                      });
                                    }
                                  },
                            child: Text(l.removeButton),
                          ),
                        ),
                      ],
                    ),
                  )
                : TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: SvColors.danger,
                    ),
                    onPressed: () => setState(() => _confirm = true),
                    child: Text(widget.isMine ? l.removeMine : l.removeAsOwner),
                  ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- expansion sheet

/// "마을 넓히기": pick a district; each paid step opens its next half (3 lots).
/// Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → then ₩25,900 per step, up to 60.
class _UpgradeSheet extends ConsumerStatefulWidget {
  const _UpgradeSheet({
    required this.village,
    required this.geometry,
    this.district,
  });
  final Village village;
  final geo.VillageGeometry geometry;
  final int? district;
  @override
  ConsumerState<_UpgradeSheet> createState() => _UpgradeSheetState();
}

class _UpgradeSheetState extends ConsumerState<_UpgradeSheet> {
  Package? _package;

  /// Store prices of every tier (local currency) for the price ladder; empty until loaded.
  Map<int, int> _credits = const {};
  bool _loading = true;
  bool _busy = false;
  String? _status;
  String? _error;
  late int? _selected =
      widget.district != null &&
          districtState(widget.village.openHalves, widget.district!) < 2
      ? widget.district
      : _choices
                .where((d) => districtState(widget.village.openHalves, d) == 1)
                .firstOrNull ??
            _choices.firstOrNull;

  VillageNotifier get _n =>
      ref.read(villageProvider(widget.village.id).notifier);
  String get _installId => ref.read(identityProvider).installId;
  int get _tier => stepTier(widget.village.capacity);
  List<int> get _choices => [
    for (var d = 0; d < districtCount; d++)
      if (districtState(widget.village.openHalves, d) < 2) d,
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final purchases = ref.read(purchaseServiceProvider);
    final results = await Future.wait<Object?>([
      _n.walletCredits().catchError((_) => <int, int>{}),
      purchases.available && _tier > 0
          ? purchases.tierPackage(_installId, _tier)
          : Future<Package?>.value(null),
    ]);
    if (!mounted) return;
    setState(() {
      _credits = results[0] as Map<int, int>;
      _package = results[1] as Package?;
      _loading = false;
    });
  }

  Future<void> _apply(Future<ActionOutcome> Function() action) async {
    final l = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
      _status = l.upgradeWaiting;
    });
    final r = await action();
    if (!mounted) return;
    if (r.ok) {
      Navigator.pop(context, _selected);
      return;
    }
    setState(() {
      _busy = false;
      _status = null;
      _error = trKey(l, r.error!);
    });
  }

  Future<void> _buy() async {
    final l = AppLocalizations.of(context);
    final package = _package;
    final district = _selected;
    if (package == null || district == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final outcome = await ref
        .read(purchaseServiceProvider)
        .buy(_installId, package);
    if (!mounted) return;
    switch (outcome) {
      case PurchaseOutcome.purchased:
        await _apply(() => _n.applyUpgradeAfterPurchase(_tier, district));
      case PurchaseOutcome.cancelled:
        setState(() => _busy = false);
      case PurchaseOutcome.failed || PurchaseOutcome.unavailable:
        setState(() {
          _busy = false;
          _error = l.errPurchaseFailed;
        });
    }
  }

  Widget _districtName(String name) {
    final text = Text(
      name,
      style: const TextStyle(
        fontWeight: FontWeight.w700,
        color: SvColors.night,
      ),
    );
    return name.contains(' ')
        ? text
        : FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: text,
          );
  }

  Widget _landmark(geo.VillageGeometry g, geo.DistrictDef d) {
    final f = d.facility;
    if (f == null) {
      return const Center(
        child: SizedBox(
          width: 44,
          height: 22,
          child: DecoratedBox(
            decoration: ShapeDecoration(
              color: Color(0xFFA9CFE6),
              shape: StadiumBorder(
                side: BorderSide(color: Color(0xFF7FA9C4), width: 2),
              ),
            ),
          ),
        ),
      );
    }
    return Image.asset(g.sprites[f.sprite]!.asset, fit: BoxFit.contain);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final purchases = ref.watch(purchaseServiceProvider);
    final lang = Localizations.localeOf(context).languageCode;
    final g = widget.geometry;
    final v = widget.village;
    Widget action;
    if (_tier == 0) {
      action = FilledButton(
        onPressed: null,
        child: Text(l.maxVillage(maxCapacity)),
      );
    } else if (_loading) {
      action = const Center(
        child: Padding(
          padding: EdgeInsets.all(12),
          child: CircularProgressIndicator(),
        ),
      );
    } else if ((_credits[_tier] ?? 0) > 0) {
      action = FilledButton(
        key: const ValueKey('use-credit'),
        onPressed: _busy || _selected == null
            ? null
            : () => _apply(() => _n.applyUpgrade(_selected!)),
        child: Text(l.useCredit),
      );
    } else if (_package != null) {
      action = FilledButton(
        key: const ValueKey('buy-upgrade'),
        onPressed: _busy || _selected == null ? null : _buy,
        child: Text(l.buyDistrict(_package!.storeProduct.priceString)),
      );
    } else {
      action = FilledButton(
        onPressed: null,
        child: Text(l.purchasesUnavailable),
      );
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l.growBig,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: SvColors.night,
            ),
          ),
          if (_tier > 0) ...[
            const SizedBox(height: 12),
            Text(
              l.pickDistrict,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: SvColors.night,
              ),
            ),
            const SizedBox(height: 8),
            GridView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              // Fixed height, so the cards don't stretch on a tablet.
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                mainAxisExtent: 76,
              ),
              children: [
                for (final d in _choices)
                  Semantics(
                    button: true,
                    selected: _selected == d,
                    label: g.districts[d].name(lang),
                    child: Material(
                      key: ValueKey('district-pick-$d'),
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: _selected == d
                              ? SvColors.night
                              : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: _busy
                            ? null
                            : () => setState(() => _selected = d),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          child: Row(
                            children: [
                              // The district's landmark (its name comes from it); the lake has a pond.
                              SizedBox(
                                width: 52,
                                height: 52,
                                child: _landmark(g, g.districts[d]),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // A name without spaces (German compounds, Japanese) shrinks to one
                                    // line instead of breaking mid-word.
                                    _districtName(g.districts[d].name(lang)),
                                    if (districtState(v.openHalves, d) == 1)
                                      Text(
                                        l.districtHalf,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: SvColors.night.withValues(
                                            alpha: 0.65,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          if (_status != null) ...[
            Text(_status!, textAlign: TextAlign.center),
            const SizedBox(height: 8),
          ],
          if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 8)],
          action,
          if (purchases.available)
            TextButton(
              onPressed: _busy
                  ? null
                  : () async {
                      final ok = await purchases.restore(_installId);
                      if (!context.mounted) return;
                      showToast(context, ok ? l.restored : l.errPurchaseFailed);
                      _load();
                    },
              child: Text(l.restorePurchases),
            ),
        ],
      ),
    );
  }
}

/// Owner of a private village: join requests (approve / decline) and members (remove).
class _MembersSheet extends ConsumerStatefulWidget {
  const _MembersSheet({required this.villageId});
  final String villageId;

  @override
  ConsumerState<_MembersSheet> createState() => _MembersSheetState();
}

class _MembersSheetState extends ConsumerState<_MembersSheet> {
  String? _busyUser;

  Future<void> _decide(String userId, {required bool approve}) async {
    setState(() => _busyUser = userId);
    final r = await ref
        .read(villageProvider(widget.villageId).notifier)
        .decideMember(userId, approve: approve);
    if (!mounted) return;
    setState(() => _busyUser = null);
    if (!r.ok) {
      showToast(context, trKey(AppLocalizations.of(context), r.error!));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final async = ref.watch(membersProvider(widget.villageId));
    final list = async.value ?? const [];
    final pending = list.where((m) => !m.approved).toList();
    final approved = list.where((m) => m.approved).toList();
    const heading = TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w800,
      color: SvColors.night,
    );
    const small = Size(64, 40);

    Widget row(String userId, String nickname, List<Widget> actions) => Padding(
      key: ValueKey('member-$userId'),
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              nickname,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: SvColors.night,
              ),
            ),
          ),
          if (_busyUser == userId)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            ...actions,
        ],
      ),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (async.isLoading && !async.hasValue)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (async.hasError && !async.hasValue)
            ErrorBox(l.errNetwork)
          else ...[
            if (pending.isNotEmpty) ...[
              Text(l.requestJoin, style: heading),
              const SizedBox(height: 6),
              for (final m in pending)
                row(m.userId, m.nickname, [
                  TextButton(
                    key: ValueKey('decline-${m.userId}'),
                    style: TextButton.styleFrom(minimumSize: small),
                    onPressed: () => _decide(m.userId, approve: false),
                    child: Text(l.decline),
                  ),
                  const SizedBox(width: 6),
                  FilledButton(
                    key: ValueKey('approve-${m.userId}'),
                    style: FilledButton.styleFrom(minimumSize: small),
                    onPressed: () => _decide(m.userId, approve: true),
                    child: Text(l.approve),
                  ),
                ]),
              const SizedBox(height: 16),
            ],
            Text(l.members, style: heading),
            const SizedBox(height: 6),
            if (approved.isEmpty)
              Text(
                l.noMembers,
                style: TextStyle(color: SvColors.night.withValues(alpha: 0.7)),
              ),
            for (final m in approved)
              row(m.userId, m.nickname, [
                TextButton(
                  key: ValueKey('remove-${m.userId}'),
                  style: TextButton.styleFrom(
                    minimumSize: small,
                    foregroundColor: SvColors.danger,
                  ),
                  onPressed: () => _decide(m.userId, approve: false),
                  child: Text(l.removeMember),
                ),
              ]),
          ],
        ],
      ),
    );
  }
}
