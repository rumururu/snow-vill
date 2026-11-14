/// Snow Village domain model (mirrors src/lib/village.ts on the web).
///
/// Village = the cathedral plaza + up to 10 districts ("동네") of 6 lots (docs/11-village-expansion-plan.md).
/// Lots of district d are slots d*6 … d*6+5, opened in halves of 3. The free village is district 0;
/// each paid step opens the next half of a district the buyer picks (up to 60 houses).
library;

import 'dart:ui' show Offset;

const int freeCapacity = 6;
const int expansionStep = 3;
const int maxCapacity = 60;
const int districtCount = 10;
const int freeOpenHalves = 0x3;
const int villageNameMax = 20;
const int nicknameMax = 10;
const int messageMax = 60;

/// Store product per price tier (same ids in App Store, Google Play, RevenueCat and the server).
const Map<int, String> tierProduct = {
  1: 'snowvillage_big_village',
  2: 'snowvillage_expand_2',
  3: 'snowvillage_expand_3',
  4: 'snowvillage_expand_4',
};

/// Price tier of the next step for a village of this size (0 = already at the maximum).
int stepTier(int capacity) {
  if (capacity >= maxCapacity) return 0;
  if (capacity <= 6) return 1;
  if (capacity == 9) return 2;
  if (capacity == 12) return 3;
  return 4;
}

int halfOf(int slot) => slot ~/ expansionStep;
bool isHalfOpen(int openHalves, int slot) =>
    slot >= 0 && slot < maxCapacity && (openHalves >> halfOf(slot)) & 1 == 1;

/// 0 = closed, 1 = first half open, 2 = fully open.
int districtState(int openHalves, int district) {
  final bits = (openHalves >> (2 * district)) & 3;
  return bits == 3 ? 2 : (bits != 0 ? 1 : 0);
}

/// openHalves after opening the next half of [district] (same rule as the server), or null when full.
int? openNextHalf(int openHalves, int district) {
  if (district < 0 || district >= districtCount) return null;
  final a = 2 * district;
  if ((openHalves >> a) & 1 == 0) return openHalves | (1 << a);
  if ((openHalves >> (a + 1)) & 1 == 0) return openHalves | (1 << (a + 1));
  return null;
}

int capacityOf(int openHalves) {
  var n = 0;
  for (var b = openHalves; b != 0; b &= b - 1) {
    n++;
  }
  return n * expansionStep;
}

/// Halves in district order up to [capacity] (fallback for older server responses).
int halvesForCapacity(int capacity) {
  final n = (capacity / expansionStep).round().clamp(
    2,
    maxCapacity ~/ expansionStep,
  );
  return (1 << n) - 1;
}

enum HouseStyle {
  wood,
  brick,
  bakery,
  tower,
  gingerbread,
  timber,
  aframe,
  windmill,
  greenhouse,
  sage,
  indigo,
}

/// Types offered when moving in (legacy colourways keep rendering but are not offered).
const pickerStyles = [
  HouseStyle.wood,
  HouseStyle.brick,
  HouseStyle.bakery,
  HouseStyle.tower,
  HouseStyle.gingerbread,
  HouseStyle.timber,
  HouseStyle.aframe,
  HouseStyle.windmill,
  HouseStyle.greenhouse,
];

HouseStyle? houseStyleFrom(String? value) {
  for (final s in HouseStyle.values) {
    if (s.name == value) return s;
  }
  return null;
}

class House {
  const House({
    required this.id,
    required this.slot,
    required this.nickname,
    required this.style,
    required this.direction,
    required this.message,
    required this.hasPhoto,
    required this.createdAt,
  });

  final String id;
  final int slot;
  final String nickname;
  final HouseStyle style;

  /// Door direction: 0 front-left, 1 front-right, 2 back-right, 3 back-left.
  final int direction;
  final String message;
  final bool hasPhoto;
  final DateTime createdAt;

  factory House.fromJson(Map<String, dynamic> j) {
    final d = (j['direction'] as num?)?.toInt() ?? 0;
    return House(
      id: j['id'] as String,
      slot: (j['slot'] as num).toInt(),
      nickname: j['nickname'] as String,
      style: houseStyleFrom(j['style'] as String?) ?? HouseStyle.wood,
      direction: d >= 0 && d <= 3 ? d : 0,
      message: (j['message'] as String?) ?? '',
      hasPhoto: j['has_photo'] == true,
      createdAt: DateTime.parse(j['created_at'] as String),
    );
  }

  House copyWith({bool? hasPhoto}) => House(
    id: id,
    slot: slot,
    nickname: nickname,
    style: style,
    direction: direction,
    message: message,
    hasPhoto: hasPhoto ?? this.hasPhoto,
    createdAt: createdAt,
  );
}

/// Path styles the village owner can pick, one for the whole village. Mirrors `PATH_STYLES` in village.ts.
enum PathStyle { dirt, stones, brick, snow }

PathStyle pathStyleFrom(Object? v) => PathStyle.values.firstWhere(
  (s) => s.name == v,
  orElse: () => PathStyle.dirt,
);

/// Ids of decorations the owner may move (plaza lamps/bench, district decoration). Same rule on the
/// server and the web (`MOVABLE_DECOR_ID`).
final movableDecorId = RegExp(
  r'^(plaza-(lamp-a|lamp-b|bench)|d[0-9]-decor[0-9]{1,2})$',
);

/// Server decor map → only well-formed entries (unknown ids and bad numbers dropped).
Map<String, Offset> cleanDecor(Object? raw) {
  final out = <String, Offset>{};
  if (raw is! Map) return out;
  for (final MapEntry(:key, :value) in raw.entries) {
    if (key is! String || !movableDecorId.hasMatch(key)) continue;
    if (value is! List || value.length != 2) continue;
    final (i, j) = (value[0], value[1]);
    if (i is num && j is num && i.abs() <= 40 && j.abs() <= 40) {
      out[key] = Offset(i.toDouble(), j.toDouble());
    }
  }
  return out;
}

class Village {
  const Village({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.houses,
    this.openHalves = freeOpenHalves,
    this.pathStyle = PathStyle.dirt,
    this.decor = const {},
  });

  /// One path style for the whole village (owner's choice).
  final PathStyle pathStyle;

  /// Decorations the owner moved: decoration id → ground spot (tiles).
  final Map<String, Offset> decor;

  final String id;
  final String name;
  final DateTime createdAt;
  final List<House> houses;

  /// Opened district halves (bit 2d = first half of district d, 2d+1 = second half).
  final int openHalves;

  /// 6 (free), then 9, 12, … 60 (= 3 × opened halves).
  int get capacity => capacityOf(openHalves);

  factory Village.fromJson(Map<String, dynamic> j) {
    final open = (j['open_halves'] as num?)?.toInt();
    final cap = (j['capacity'] as num?)?.toInt() ?? freeCapacity;
    return Village(
      id: j['id'] as String,
      name: j['name'] as String,
      createdAt: DateTime.parse(j['created_at'] as String),
      openHalves: open != null && open > 0 ? open : halvesForCapacity(cap),
      pathStyle: pathStyleFrom(j['path_style']),
      decor: cleanDecor(j['decor']),
      houses:
          ((j['houses'] as List?) ?? const [])
              .map((h) => House.fromJson(h as Map<String, dynamic>))
              .toList()
            ..sort((a, b) => a.slot.compareTo(b.slot)),
    );
  }

  Village copyWith({
    int? openHalves,
    List<House>? houses,
    PathStyle? pathStyle,
    Map<String, Offset>? decor,
  }) => Village(
    id: id,
    name: name,
    createdAt: createdAt,
    houses: houses ?? this.houses,
    openHalves: openHalves ?? this.openHalves,
    pathStyle: pathStyle ?? this.pathStyle,
    decor: decor ?? this.decor,
  );

  House? houseAt(int slot) {
    for (final h in houses) {
      if (h.slot == slot) return h;
    }
    return null;
  }

  bool get isFull => houses.length >= capacity;

  /// How many more houses can move in (capacity minus houses).
  int get remaining => (capacity - houses.length).clamp(0, capacity);

  bool get canUpgrade => capacity < maxCapacity;

  /// Opened lots (slots of opened halves).
  List<int> get openSlots => [
    for (var i = 0; i < maxCapacity; i++)
      if (isHalfOpen(openHalves, i)) i,
  ];

  /// Lots that can be claimed now.
  List<int> get freeSlots {
    if (isFull) return const [];
    final taken = houses.map((h) => h.slot).toSet();
    return [
      for (final s in openSlots)
        if (!taken.contains(s)) s,
    ];
  }

  /// Lots not opened yet.
  List<int> get lockedSlots => [
    for (var i = 0; i < maxCapacity; i++)
      if (!isHalfOpen(openHalves, i)) i,
  ];
}
