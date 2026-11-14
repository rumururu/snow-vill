import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../data/remote_api.dart' show AccountVillage;
import '../l10n/app_localizations.dart';
import '../scene/village_scene.dart';
import '../state/providers.dart';
import '../ui/common.dart';
import 'account_sheet.dart';

/// Decorative hero village: a small free village (6 lots, 4 houses lit, 2 lots waiting for friends).
/// Illustrative only, no user data. Same as the web (`LandingHero`).
final _heroVillage = Village(
  id: 'hero',
  name: 'Snow Village',
  createdAt: DateTime(2026, 12, 1),
  openHalves: freeOpenHalves,
  houses: [
    for (final (slot, style, dir) in [
      (0, HouseStyle.brick, 0),
      (1, HouseStyle.gingerbread, 1),
      (2, HouseStyle.bakery, 3),
      (4, HouseStyle.timber, 3),
    ])
      House(
        id: 'h$slot',
        slot: slot,
        nickname: '',
        style: style,
        direction: dir,
        message: '',
        hasPhoto: false,
        createdAt: DateTime(2026, 12, 1),
      ),
  ],
);

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final identity = ref.watch(identityProvider);
    final geometry = ref.watch(villageGeometryProvider);
    final session = ref.watch(sessionProvider);
    // Signed in: the account's villages merged with the ones opened on this device.
    final account = {
      for (final a in ref.watch(myVillagesProvider).value ?? <AccountVillage>[])
        a.id: a,
    };
    final villages = [
      for (final k in identity.villages)
        (id: k.id, name: account[k.id]?.name ?? k.name, account: account[k.id]),
      for (final a in account.values)
        if (!identity.villages.any((k) => k.id == a.id))
          (id: a.id, name: a.name, account: a),
    ];

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Row(
              children: [
                const Text('❄️', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                Text(
                  l.appTitle,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: SvColors.night,
                  ),
                ),
                const Spacer(),
                if (signInAvailable(ref))
                  IconButton(
                    key: const ValueKey('account'),
                    tooltip: session == null
                        ? l.signIn
                        : (session.user.email ?? l.signOut),
                    color: SvColors.night,
                    icon: Icon(
                      session == null
                          ? Icons.account_circle_outlined
                          : Icons.account_circle,
                    ),
                    onPressed: () => showAccountSheet(context),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              l.tagline,
              style: const TextStyle(
                fontSize: 28,
                height: 1.25,
                fontWeight: FontWeight.w800,
                color: SvColors.night,
              ),
            ),
            const SizedBox(height: 16),
            geometry.when(
              data: (g) => ExcludeSemantics(
                child: AspectRatio(
                  aspectRatio: 0.95,
                  child: VillageMapView(
                    geometry: g,
                    village: _heroVillage,
                    interactive: false,
                  ),
                ),
              ),
              loading: () =>
                  const AspectRatio(aspectRatio: 1, child: SizedBox()),
              error: (_, _) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const ValueKey('create-village'),
              onPressed: () => context.push('/create'),
              child: Text(l.createVillage),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              key: const ValueKey('open-link'),
              onPressed: () => _openLinkDialog(context),
              child: Text(l.openByLink),
            ),
            const SizedBox(height: 28),
            Text(
              l.myVillages,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: SvColors.night,
              ),
            ),
            const SizedBox(height: 8),
            if (villages.isEmpty)
              Text(
                l.noVillages,
                style: TextStyle(
                  color: SvColors.night.withValues(alpha: 0.7),
                  height: 1.5,
                ),
              )
            else
              for (final v in villages)
                Card(
                  color: Colors.white,
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ListTile(
                    key: ValueKey('village-${v.id}'),
                    minVerticalPadding: 14,
                    leading: Icon(
                      identity.owners.containsKey(v.id) ||
                              v.account?.role == 'owner'
                          ? Icons.home_work_outlined
                          : Icons.cottage_outlined,
                      color: SvColors.night,
                    ),
                    title: Row(
                      children: [
                        Flexible(
                          child: Text(
                            v.name,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (v.account?.isPrivate == true) ...[
                          const SizedBox(width: 6),
                          Icon(
                            Icons.lock_outline,
                            size: 16,
                            semanticLabel: l.privateVillage,
                            color: SvColors.night.withValues(alpha: 0.6),
                          ),
                        ],
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if ((v.account?.pending ?? 0) > 0)
                          Badge(
                            key: ValueKey('pending-${v.id}'),
                            label: Text('${v.account!.pending}'),
                            backgroundColor: SvColors.danger,
                          ),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                    onTap: () async {
                      await context.push('/v/${v.id}');
                      if (ref.read(sessionProvider) != null) {
                        ref.invalidate(myVillagesProvider);
                      }
                    },
                  ),
                ),
            const SizedBox(height: 20),
            Center(
              child: TextButton(
                onPressed: () => launchUrl(
                  Uri.parse('$webBase/privacy/'),
                  mode: LaunchMode.externalApplication,
                ),
                child: Text(l.privacyPolicy),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openLinkDialog(BuildContext context) async {
    final l = AppLocalizations.of(context);
    final controller = TextEditingController();
    String? error;
    final id = await showDialog<String>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, setState) => AlertDialog(
          title: Text(l.openLinkTitle),
          content: TextField(
            key: const ValueKey('link-input'),
            controller: controller,
            autofocus: true,
            decoration: InputDecoration(
              hintText: l.openLinkHint,
              errorText: error,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: Text(l.cancel),
            ),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(88, 44)),
              onPressed: () {
                final parsed = parseVillageId(controller.text);
                if (parsed == null) {
                  setState(() => error = l.linkInvalid);
                } else {
                  Navigator.pop(c, parsed);
                }
              },
              child: Text(l.openButton),
            ),
          ],
        ),
      ),
    );
    if (id != null && context.mounted) context.push('/v/$id');
  }
}
