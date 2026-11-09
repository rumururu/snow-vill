import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../data/photo.dart';
import '../data/validation.dart';
import '../l10n/app_localizations.dart';
import '../scene/village_scene.dart';
import '../state/providers.dart';
import '../ui/common.dart';

/// Claim draft kept on the screen so it survives closing the sheet and failed submits.
class _Draft {
  String nickname = '';
  HouseStyle style = HouseStyle.wood;
  String message = '';
  Uint8List? photo;
  void reset() {
    nickname = '';
    style = HouseStyle.wood;
    message = '';
    photo = null;
  }
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

  VillageNotifier get _notifier => ref.read(villageProvider(widget.villageId).notifier);

  String _styleLabel(AppLocalizations l, HouseStyle s) => switch (s) {
        HouseStyle.wood => l.styleWood,
        HouseStyle.sage => l.styleSage,
        HouseStyle.indigo => l.styleIndigo,
      };

  void _onSlot(Village v, int slot) {
    final l = AppLocalizations.of(context);
    final house = v.houseAt(slot);
    if (house != null) {
      _openFrame(v, house);
      return;
    }
    final mine = ref.read(identityProvider).houses[v.id];
    if (mine != null && v.houses.any((h) => h.id == mine.houseId)) {
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
      builder: (_) => _ClaimSheet(villageId: v.id, slot: slot, draft: _draft, intro: intro, styleLabel: _styleLabel),
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
    Timer(const Duration(milliseconds: 1200), () => mounted ? setState(() => _ignite = null) : null);
    showToast(context, r.photoError != null ? l.photoFailedAfterClaim : l.litUp(r.house.nickname));
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
        isMine: identity.houses[v.id]?.houseId == house.id,
        isOwner: identity.owners.containsKey(v.id),
        styleLabel: _styleLabel,
      ),
    );
    if (removed == true && mounted) showToast(context, AppLocalizations.of(context).houseRemoved(house.nickname));
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
            Text(l.inviteTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: SvColors.night)),
            const SizedBox(height: 8),
            Text(l.inviteBody(v.freeSlots.length), style: const TextStyle(color: SvColors.night)),
            const SizedBox(height: 12),
            SelectableText(url, style: const TextStyle(fontSize: 13, color: SvColors.night)),
            const SizedBox(height: 12),
            FilledButton(
              key: const ValueKey('share-invite'),
              onPressed: () => SharePlus.instance.share(ShareParams(text: l.shareText(url), subject: v.name)),
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
            Text(l.inviteNote, style: TextStyle(fontSize: 12, height: 1.5, color: SvColors.night.withValues(alpha: 0.7))),
          ],
        ),
      ),
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
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(l.cancel)),
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
    final geometry = ref.watch(sceneGeometryProvider).value;
    final identity = ref.watch(identityProvider);
    final village = async.value;

    if (village != null && geometry != null && widget.isNew && !_firstPromptShown) {
      _firstPromptShown = true;
      if (village.houseAt(0) == null && !identity.houses.containsKey(village.id)) {
        WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? _openClaim(village, 0, intro: true) : null);
      }
    }

    Widget body;
    if (village == null && async.isLoading || geometry == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (village == null && async.hasError) {
      body = _Message(icon: '📡', title: l.loadFailed, action: FilledButton(onPressed: () => _notifier.refresh(), child: Text(l.retry)));
    } else if (village == null) {
      body = _Message(icon: '🌨️', title: l.notFoundTitle, body: l.notFoundBody);
    } else {
      final myHouseId = identity.houses[village.id]?.houseId;
      final myHouse = village.houses.where((h) => h.id == myHouseId).firstOrNull;
      body = RefreshIndicator(
        onRefresh: () => _notifier.refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 16),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                  child: Text(l.occupancy(village.houses.length), style: const TextStyle(fontWeight: FontWeight.w700, color: SvColors.night)),
                ),
                const SizedBox(width: 8),
                Text(village.isFull ? l.villageComplete : l.freeHouses(village.freeSlots.length),
                    style: TextStyle(color: SvColors.night.withValues(alpha: 0.7))),
              ]),
            ),
            const SizedBox(height: 10),
            VillageSceneView(
              key: const ValueKey('village-scene'),
              geometry: geometry,
              village: village,
              myHouseId: myHouseId,
              igniteSlot: _ignite,
              onSlotTap: (slot) => _onSlot(village, slot),
              slotLabel: (slot, h) => h == null ? '${slot + 1} · ${l.makeMyHouse}' : l.frameTitle(h.nickname),
            ),
            const SizedBox(height: 8),
            Text(l.tapHint, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: SvColors.night.withValues(alpha: 0.6))),
            if (async.hasError)
              Padding(padding: const EdgeInsets.all(8), child: ErrorBox(l.errNetwork)),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(children: [
                if (!village.isFull)
                  Expanded(
                    child: myHouse != null
                        ? OutlinedButton(onPressed: () => _openFrame(village, myHouse), child: Text(l.myHouse))
                        : FilledButton(
                            key: const ValueKey('make-house'),
                            onPressed: () => _openClaim(village, village.freeSlots.first),
                            child: Text(l.makeMyHouse),
                          ),
                  ),
                if (!village.isFull) const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(key: const ValueKey('invite'), onPressed: () => _openInvite(village), child: Text(l.invite)),
                ),
              ]),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: SvColors.sky,
        title: Text(village?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w800, color: SvColors.night)),
        centerTitle: true,
        actions: [
          if (village != null && identity.owners.containsKey(village.id))
            PopupMenuButton<String>(
              onSelected: (_) => _confirmDelete(village),
              itemBuilder: (_) => [PopupMenuItem(value: 'delete', child: Text(l.deleteVillage))],
            ),
        ],
      ),
      body: SafeArea(child: body),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.title, this.body, this.action});
  final String icon;
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(icon, style: const TextStyle(fontSize: 44)),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: SvColors.night)),
            if (body != null) ...[
              const SizedBox(height: 8),
              Text(body!, textAlign: TextAlign.center, style: TextStyle(color: SvColors.night.withValues(alpha: 0.7))),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ]),
        ),
      );
}

// ---------------------------------------------------------------- claim sheet

class _ClaimSheet extends ConsumerStatefulWidget {
  const _ClaimSheet({required this.villageId, required this.slot, required this.draft, required this.intro, required this.styleLabel});
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
      final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2048, maxHeight: 2048);
      if (file == null) return;
      widget.draft.photo = await preparePhoto(await file.readAsBytes());
      _submitError = null;
    } on PhotoException catch (e) {
      if (mounted) _submitError = trKey(AppLocalizations.of(context), e.code == 'tooLarge' ? 'errPhotoTooLarge' : 'errPhotoUnsupported');
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
    final r = await ref.read(villageProvider(widget.villageId).notifier).claim(
          widget.slot,
          nickname: _nick.text,
          style: widget.draft.style,
          message: _msg.text,
          photo: widget.draft.photo,
        );
    if (!mounted) return;
    setState(() => _busy = false);
    if (r.ok) {
      Navigator.pop(context, r.value);
      return;
    }
    final free = ref.read(villageProvider(widget.villageId)).value?.freeSlots.where((s) => s != widget.slot).toList() ?? [];
    setState(() {
      _submitError = trKey(l, r.error!);
      _moveTo = r.error == 'errSlotTaken' && free.isNotEmpty ? free.first : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final geometry = ref.watch(sceneGeometryProvider).value;
    final d = widget.draft;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              children: [
                Text(l.claimTitle(widget.slot + 1), style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: SvColors.night)),
                if (widget.intro) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: SvColors.glow.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(12)),
                    child: Text(l.firstHouseIntro, style: const TextStyle(color: SvColors.night)),
                  ),
                ],
                if (geometry != null)
                  Center(child: Image.asset(geometry.sprites[geometry.houseSprite(d.style)]!.asset, height: 130)),
                TextField(
                  key: const ValueKey('nickname'),
                  controller: _nick,
                  autofocus: true,
                  onChanged: (v) => d.nickname = v,
                  decoration: InputDecoration(labelText: '${l.nickname} *', hintText: l.nicknameHint, errorText: _nickError, counterText: '${charLength(_nick.text)}/$nicknameMax'),
                ),
                const SizedBox(height: 14),
                Text(l.houseStyle, style: const TextStyle(fontWeight: FontWeight.w700, color: SvColors.night)),
                const SizedBox(height: 8),
                SegmentedButton<HouseStyle>(
                  segments: [for (final s in HouseStyle.values) ButtonSegment(value: s, label: Text(widget.styleLabel(l, s)))],
                  selected: {d.style},
                  onSelectionChanged: (v) => setState(() => d.style = v.first),
                ),
                const SizedBox(height: 16),
                Text('${l.photo} ${l.optional}', style: const TextStyle(fontWeight: FontWeight.w700, color: SvColors.night)),
                const SizedBox(height: 8),
                Row(children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 72,
                      height: 72,
                      child: d.photo != null ? Image.memory(d.photo!, fit: BoxFit.cover) : Container(color: SvColors.sky, child: const Icon(Icons.photo_outlined, color: SvColors.sage)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      OutlinedButton(
                        key: const ValueKey('pick-photo'),
                        onPressed: _photoBusy ? null : _pickPhoto,
                        child: Text(_photoBusy ? '…' : (d.photo != null ? l.changePhoto : l.choosePhoto)),
                      ),
                      if (d.photo != null) TextButton(onPressed: () => setState(() => d.photo = null), child: Text(l.removePhoto)),
                    ]),
                  ),
                ]),
                const SizedBox(height: 6),
                Text(l.photoHint, style: TextStyle(fontSize: 12, color: SvColors.night.withValues(alpha: 0.6))),
                const SizedBox(height: 14),
                TextField(
                  key: const ValueKey('message'),
                  controller: _msg,
                  maxLines: 2,
                  onChanged: (v) => setState(() => d.message = v),
                  decoration: InputDecoration(labelText: '${l.message} ${l.optional}', hintText: l.messageHint, errorText: _msgError, counterText: '${charLength(_msg.text)}/$messageMax'),
                ),
                const SizedBox(height: 8),
                Text.rich(TextSpan(children: [
                  TextSpan(text: '${l.visibilityNote} '),
                  WidgetSpan(
                    child: GestureDetector(
                      onTap: () => launchUrl(Uri.parse('$webBase/privacy/'), mode: LaunchMode.externalApplication),
                      child: Text(l.privacyPolicy, style: const TextStyle(fontSize: 12, decoration: TextDecoration.underline, color: SvColors.night)),
                    ),
                  ),
                ]), style: TextStyle(fontSize: 12, height: 1.5, color: SvColors.night.withValues(alpha: 0.6))),
              ],
            ),
          ),
          // Sticky footer: errors stay on screen next to the button (no scrolling needed).
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (_submitError != null) ...[
                ErrorBox(
                  _submitError!,
                  action: _moveTo == null
                      ? null
                      : OutlinedButton(
                          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44)),
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
            ]),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- photo frame sheet

class _FrameSheet extends ConsumerStatefulWidget {
  const _FrameSheet({required this.villageId, required this.house, required this.isMine, required this.isOwner, required this.styleLabel});
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

  VillageNotifier get _n => ref.read(villageProvider(widget.villageId).notifier);

  @override
  void initState() {
    super.initState();
    if (_hasPhoto) _url = _n.photoUrl(widget.house.id);
  }

  Future<void> _changePhoto() async {
    final l = AppLocalizations.of(context);
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2048, maxHeight: 2048);
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
      if (mounted) setState(() => _error = trKey(l, e.code == 'tooLarge' ? 'errPhotoTooLarge' : 'errPhotoUnsupported'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final h = widget.house;
    final date = DateFormat.yMMMd(Localizations.localeOf(context).toLanguageTag()).format(h.createdAt.toLocal());
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.frameTitle(h.nickname), style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: SvColors.night)),
        const SizedBox(height: 14),
        Center(
          child: Container(
            width: 300,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: SvColors.wood, borderRadius: BorderRadius.circular(28)),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFFF8EA), borderRadius: BorderRadius.circular(20)),
              child: AspectRatio(
                aspectRatio: 1,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: !_hasPhoto
                      ? Container(color: SvColors.sky, child: const Center(child: Text('⛄', style: TextStyle(fontSize: 96))))
                      : FutureBuilder<String>(
                          future: _url,
                          builder: (c, s) => s.hasError
                              ? Center(child: TextButton(onPressed: () => setState(() => _url = _n.photoUrl(h.id)), child: Text(l.photoLoadFailed)))
                              : !s.hasData
                                  ? const Center(child: CircularProgressIndicator())
                                  : Image.network(s.data!, key: const ValueKey('frame-photo'), fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) => Center(child: Text(l.photoLoadFailed))),
                        ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(h.message.isEmpty ? l.noMessage : '“${h.message}”', textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, height: 1.5, color: SvColors.night)),
        const SizedBox(height: 6),
        Text('${widget.styleLabel(l, h.style)} · ${l.joinedOn(date)}', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: SvColors.night.withValues(alpha: 0.6))),
        const Divider(height: 32),
        if (widget.isMine) OutlinedButton(onPressed: _busy ? null : _changePhoto, child: Text(_hasPhoto ? l.changePhoto : l.addPhoto)),
        if (_error != null) ...[const SizedBox(height: 8), ErrorBox(_error!)],
        if (_notice != null) ...[const SizedBox(height: 8), Text(_notice!, textAlign: TextAlign.center)],
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
                  action: Row(children: [
                    Expanded(child: OutlinedButton(onPressed: () => setState(() => _confirm = false), child: Text(l.cancel))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: SvColors.danger),
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
                  ]),
                )
              : TextButton(
                  style: TextButton.styleFrom(foregroundColor: SvColors.danger),
                  onPressed: () => setState(() => _confirm = true),
                  child: Text(widget.isMine ? l.removeMine : l.removeAsOwner),
                ),
      ]),
    );
  }
}

