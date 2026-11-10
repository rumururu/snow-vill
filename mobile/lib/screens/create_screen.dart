import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/models.dart';
import '../data/validation.dart';
import '../l10n/app_localizations.dart';
import '../scene/village_scene.dart';
import '../state/providers.dart';
import '../ui/common.dart';

class CreateScreen extends ConsumerStatefulWidget {
  const CreateScreen({super.key});
  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  final _name = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final r = await createVillage(ref, _name.text);
    if (!mounted) return;
    if (!r.ok) {
      setState(() {
        _busy = false;
        _error = trKey(AppLocalizations.of(context), r.error!);
      });
      return;
    }
    context.pushReplacement('/v/${r.value}?new=1');
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final geometry = ref.watch(sceneGeometryProvider);
    final preview = Village(id: 'preview', name: _name.text, createdAt: DateTime(2026), houses: const []);
    return Scaffold(
      appBar: AppBar(backgroundColor: SvColors.sky),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            Text(l.createHeading, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: SvColors.night)),
            const SizedBox(height: 14),
            TextField(
              key: const ValueKey('village-name'),
              controller: _name,
              autofocus: true,
              textInputAction: TextInputAction.done,
              onChanged: (_) => setState(() => _error = null),
              onSubmitted: (_) => _submit(),
              style: const TextStyle(fontSize: 18),
              decoration: InputDecoration(
                hintText: l.villageNameHint,
                errorText: _error,
                counterText: '${charLength(_name.text.trim())}/$villageNameMax',
              ),
            ),
            const SizedBox(height: 12),
            geometry.when(
              data: (g) => ExcludeSemantics(child: VillageSceneView(geometry: g, village: preview)),
              loading: () => const AspectRatio(aspectRatio: 1, child: SizedBox()),
              error: (_, _) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 8),
            Text(l.createCapacity, textAlign: TextAlign.center, style: TextStyle(color: SvColors.night.withValues(alpha: 0.7))),
            const SizedBox(height: 20),
            FilledButton(
              key: const ValueKey('create-submit'),
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? l.creating : l.createButton),
            ),
          ],
        ),
      ),
    );
  }
}
