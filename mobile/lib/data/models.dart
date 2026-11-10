/// Snow Village domain model (mirrors src/lib/village.ts on the web).
library;

/// Lots in the scene (= the paid big village's capacity).
const int villageCapacity = 8;
/// Free villages hold up to 6 houses; more than 6 is a paid big village (owner decision 2026-11-10).
const int freeCapacity = 6;
const int bigCapacity = 8;
const String bigVillageProductId = 'snowvillage_big_village';
const int villageNameMax = 20;
const int nicknameMax = 10;
const int messageMax = 60;

enum HouseStyle { wood, sage, indigo }

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
    required this.message,
    required this.hasPhoto,
    required this.createdAt,
  });

  final String id;
  final int slot;
  final String nickname;
  final HouseStyle style;
  final String message;
  final bool hasPhoto;
  final DateTime createdAt;

  factory House.fromJson(Map<String, dynamic> j) => House(
        id: j['id'] as String,
        slot: (j['slot'] as num).toInt(),
        nickname: j['nickname'] as String,
        style: houseStyleFrom(j['style'] as String?) ?? HouseStyle.wood,
        message: (j['message'] as String?) ?? '',
        hasPhoto: j['has_photo'] == true,
        createdAt: DateTime.parse(j['created_at'] as String),
      );

  House copyWith({bool? hasPhoto}) => House(
        id: id,
        slot: slot,
        nickname: nickname,
        style: style,
        message: message,
        hasPhoto: hasPhoto ?? this.hasPhoto,
        createdAt: createdAt,
      );
}

class Village {
  const Village({required this.id, required this.name, required this.createdAt, required this.houses, this.capacity = freeCapacity});

  final String id;
  final String name;
  final DateTime createdAt;
  final List<House> houses;

  /// 6 (free) or 8 (paid big village).
  final int capacity;

  factory Village.fromJson(Map<String, dynamic> j) => Village(
        id: j['id'] as String,
        name: j['name'] as String,
        createdAt: DateTime.parse(j['created_at'] as String),
        capacity: (j['capacity'] as num?)?.toInt() == bigCapacity ? bigCapacity : freeCapacity,
        houses: ((j['houses'] as List?) ?? const [])
            .map((h) => House.fromJson(h as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.slot.compareTo(b.slot)),
      );

  House? houseAt(int slot) {
    for (final h in houses) {
      if (h.slot == slot) return h;
    }
    return null;
  }

  bool get isFull => houses.length >= capacity;

  /// How many more houses can move in (capacity minus houses) — not the number of empty lots.
  int get remaining => (capacity - houses.length).clamp(0, capacity);

  bool get canUpgrade => capacity < bigCapacity;

  List<int> get _emptySlots {
    final taken = houses.map((h) => h.slot).toSet();
    return [for (var i = 0; i < villageCapacity; i++) if (!taken.contains(i)) i];
  }

  /// Lots that can be claimed now (none once the village reached its capacity).
  List<int> get freeSlots => isFull ? const [] : _emptySlots;

  /// Empty lots that need the big-village upgrade.
  List<int> get lockedSlots => isFull && canUpgrade ? _emptySlots : const [];
}
