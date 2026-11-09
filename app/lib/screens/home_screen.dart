import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../l10n/app_localizations.dart';
import '../scene/village_scene.dart';
import '../state/providers.dart';
import '../ui/common.dart';

/// Decorative hero village (illustrative only, no user data).
final _heroVillage = Village(
  id: 'hero',
  name: 'Snow Village',
  createdAt: DateTime(2026, 12, 1),
  houses: [
    for (final (slot, style) in [(0, HouseStyle.wood), (1, HouseStyle.sage), (2, HouseStyle.indigo), (3, HouseStyle.indigo), (4, HouseStyle.wood), (6, HouseStyle.sage), (7, HouseStyle.wood)])
      House(id: 'h$slot', slot: slot, nickname: '', style: style, message: '', hasPhoto: false, createdAt: DateTime(2026, 12, 1)),
  ],
);

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final identity = ref.watch(identityProvider);
    final geometry = ref.watch(sceneGeometryProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Row(children: [
              const Text('❄️', style: TextStyle(fontSize: 22)),
              const SizedBox(width: 8),
              Text(l.appTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: SvColors.night)),
            ]),
            const SizedBox(height: 20),
            Text(l.tagline, style: const TextStyle(fontSize: 28, height: 1.25, fontWeight: FontWeight.w800, color: SvColors.night)),
            const SizedBox(height: 10),
            Text(l.taglineBody, style: TextStyle(fontSize: 15, height: 1.5, color: SvColors.night.withValues(alpha: 0.75))),
            const SizedBox(height: 16),
            geometry.when(
              data: (g) => ExcludeSemantics(child: VillageSceneView(geometry: g, village: _heroVillage)),
              loading: () => const AspectRatio(aspectRatio: 1, child: SizedBox()),
              error: (_, _) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            FilledButton(key: const ValueKey('create-village'), onPressed: () => context.push('/create'), child: Text(l.createVillage)),
            const SizedBox(height: 10),
            OutlinedButton(key: const ValueKey('open-link'), onPressed: () => _openLinkDialog(context), child: Text(l.openByLink)),
            const SizedBox(height: 28),
            Text(l.myVillages, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: SvColors.night)),
            const SizedBox(height: 8),
            if (identity.villages.isEmpty)
              Text(l.noVillages, style: TextStyle(color: SvColors.night.withValues(alpha: 0.7), height: 1.5))
            else
              for (final v in identity.villages)
                Card(
                  color: Colors.white,
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ListTile(
                    key: ValueKey('village-${v.id}'),
                    minVerticalPadding: 14,
                    leading: Icon(identity.owners.containsKey(v.id) ? Icons.home_work_outlined : Icons.cottage_outlined, color: SvColors.night),
                    title: Text(v.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/v/${v.id}'),
                  ),
                ),
            const SizedBox(height: 20),
            Center(
              child: TextButton(
                onPressed: () => launchUrl(Uri.parse('$webBase/privacy/'), mode: LaunchMode.externalApplication),
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
            decoration: InputDecoration(hintText: l.openLinkHint, errorText: error),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c), child: Text(l.cancel)),
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
