/// Photo preparation: centre-crop to 1:1, resize to 512px and re-encode as JPEG.
/// Re-encoding drops EXIF/GPS metadata; the server strips metadata segments again.
library;

import 'dart:isolate';
import 'dart:typed_data';

import 'package:image/image.dart' as img;

const int maxPhotoBytes = 10 * 1024 * 1024;
const int photoOutputSize = 512;

class PhotoException implements Exception {
  PhotoException(this.code);
  final String code; // 'tooLarge' | 'unsupported'
}

Future<Uint8List> preparePhoto(Uint8List input) async {
  if (input.length > maxPhotoBytes) throw PhotoException('tooLarge');
  final out = await Isolate.run(() => _process(input));
  if (out == null) throw PhotoException('unsupported');
  return out;
}

Uint8List? _process(Uint8List input) {
  final decoded = img.decodeImage(input);
  if (decoded == null) return null;
  final oriented = img.bakeOrientation(decoded);
  final side = oriented.width < oriented.height
      ? oriented.width
      : oriented.height;
  final cropped = img.copyCrop(
    oriented,
    x: (oriented.width - side) ~/ 2,
    y: (oriented.height - side) ~/ 2,
    width: side,
    height: side,
  );
  final resized = img.copyResize(
    cropped,
    width: photoOutputSize,
    height: photoOutputSize,
    interpolation: img.Interpolation.average,
  );
  resized.exif = img.ExifData();
  return Uint8List.fromList(img.encodeJpg(resized, quality: 82));
}
