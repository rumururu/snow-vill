/// Snow Village domain model (mirrors src/lib/village.ts on the web).
library;

const int villageCapacity = 8;
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
  const Village({required this.id, required this.name, required this.createdAt, required this.houses});

  final String id;
  final String name;
  final DateTime createdAt;
  final List<House> houses;

  factory Village.fromJson(Map<String, dynamic> j) => Village(
        id: j['id'] as String,
        name: j['name'] as String,
        createdAt: DateTime.parse(j['created_at'] as String),
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

  bool get isFull => houses.length >= villageCapacity;

  List<int> get freeSlots {
    final taken = houses.map((h) => h.slot).toSet();
    return [for (var i = 0; i < villageCapacity; i++) if (!taken.contains(i)) i];
  }
}
