// Host side of integration_test/store_shots_test.dart: writes each screenshot (and its crop hints) to $SHOT_OUT.
import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() => integrationDriver(
  onScreenshot: (name, bytes, [args]) async {
    final out = Platform.environment['SHOT_OUT'] ?? 'build/store_shots';
    // "<name>__crop<px>" → <name>.png + <name>.json {"crop_bottom": px}
    final m = RegExp(r'^(.*)__crop(\d+)$').firstMatch(name);
    if (m != null) {
      name = m.group(1)!;
      args = {'crop_bottom': int.parse(m.group(2)!)};
    }
    final f = File('$out/$name.png');
    await f.create(recursive: true);
    await f.writeAsBytes(bytes);
    if (args != null && args.isNotEmpty) {
      await File('$out/$name.json').writeAsString(jsonEncode(args));
    }
    return true;
  },
);
