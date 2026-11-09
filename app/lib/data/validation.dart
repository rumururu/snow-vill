/// Client-side validation, identical rules to the web and the server
/// (lengths count Unicode code points, like PostgreSQL char_length).
library;

import 'models.dart';

int charLength(String text) => text.runes.length;

String sanitizeText(String raw, {bool multiline = false}) {
  if (multiline) {
    final noControl = raw.replaceAll(RegExp(r'[\u0000-\u0009\u000B-\u001F\u007F]'), ' ');
    return noControl
        .replaceAll(RegExp(r'[ \t]+'), ' ')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }
  return raw.replaceAll(RegExp(r'[\u0000-\u001F\u007F]'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
}

/// Returns an error key (see l10n) or null when valid.
String? villageNameError(String raw) {
  final v = sanitizeText(raw);
  if (v.isEmpty) return 'nameRequired';
  if (charLength(v) > villageNameMax) return 'nameTooLong';
  return null;
}

String? nicknameError(String raw) {
  final v = sanitizeText(raw);
  if (v.isEmpty) return 'nicknameRequired';
  if (charLength(v) > nicknameMax) return 'nicknameTooLong';
  return null;
}

String? messageError(String raw) {
  return charLength(sanitizeText(raw, multiline: true)) > messageMax ? 'messageTooLong' : null;
}
