// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => '친구들과 만드는\n우리만의 겨울 마을';

  @override
  String get taglineBody =>
      '친구 한 명이 집 한 채. 성당 광장을 가운데 두고 동네를 하나씩 열어 60채까지 넓혀요. 동네마다 아이스링크·산타의 집 같은 시설이 생기고, 사진은 집을 눌렀을 때만 보여요.';

  @override
  String get createVillage => '새 마을 만들기';

  @override
  String get openByLink => '초대 링크로 마을 열기';

  @override
  String get myVillages => '내 마을';

  @override
  String get noVillages => '아직 마을이 없어요. 새 마을을 만들거나 친구에게 받은 초대 링크를 열어 보세요.';

  @override
  String get privacyPolicy => '개인정보처리방침';

  @override
  String get createHeading => '우리 마을의 이름은?';

  @override
  String get villageNameHint => '예: 눈송이 마을';

  @override
  String get createCapacity =>
      '친구 6명까지 무료로 한 집씩 입주할 수 있어요. 동네를 열어 60채까지 넓힐 수 있어요.';

  @override
  String get createButton => '마을 생성하기';

  @override
  String get creating => '만드는 중…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return '$count채 더 입주할 수 있어요';
  }

  @override
  String get villageComplete => '마을이 완성됐어요';

  @override
  String get tapHint => '불 켜진 집을 누르면 사진 액자가, 빈 집을 누르면 내 집 만들기가 열려요.';

  @override
  String get makeMyHouse => '내 집 만들기';

  @override
  String get myHouse => '내 집 보기';

  @override
  String get invite => '친구 초대';

  @override
  String get deleteVillage => '마을 삭제';

  @override
  String get deleteConfirmTitle => '마을을 삭제할까요?';

  @override
  String deleteConfirmBody(int count) {
    return '집 $count채와 사진, 메시지가 모두 지워지고 되돌릴 수 없어요.';
  }

  @override
  String get deleteButton => '마을과 모든 집 삭제하기';

  @override
  String get loadFailed => '마을을 불러오지 못했어요';

  @override
  String get retry => '다시 시도';

  @override
  String get notFoundTitle => '마을을 찾을 수 없어요';

  @override
  String get notFoundBody => '링크가 잘못되었거나 마을이 삭제되었을 수 있어요.';

  @override
  String claimTitle(int slot) {
    return '$slot번 집터에 내 집 만들기';
  }

  @override
  String get firstHouseIntro => '마을이 생겼어요! 첫 번째 집을 지어 불을 켜 볼까요?';

  @override
  String get nickname => '닉네임';

  @override
  String get nicknameHint => '친구들이 알아볼 이름';

  @override
  String get houseStyle => '집 모양';

  @override
  String get styleWood => '나무';

  @override
  String get styleSage => '세이지';

  @override
  String get styleIndigo => '인디고';

  @override
  String get photo => '사진';

  @override
  String get optional => '(선택)';

  @override
  String get choosePhoto => '사진 고르기';

  @override
  String get changePhoto => '사진 바꾸기';

  @override
  String get addPhoto => '사진 올리기';

  @override
  String get removePhoto => '사진 빼기';

  @override
  String get photoHint => '사진 없이도 참여할 수 있어요. 정사각형으로 잘리고 위치 정보(EXIF)는 지워져요.';

  @override
  String get message => '한마디';

  @override
  String get messageHint => '마을 친구들에게 남길 한마디';

  @override
  String get visibilityNote => '입력한 닉네임·한마디·사진은 이 마을 링크를 가진 사람에게 보여요.';

  @override
  String get submitHouse => '내 집 완성하기';

  @override
  String get submitting => '집 짓는 중…';

  @override
  String moveToSlot(int slot) {
    return '$slot번 빈 집터로 옮기기';
  }

  @override
  String frameTitle(String name) {
    return '$name의 작은 집';
  }

  @override
  String get noMessage => '남긴 메시지가 없어요.';

  @override
  String joinedOn(String date) {
    return '$date 입주';
  }

  @override
  String get report => '부적절한 내용 신고하기';

  @override
  String get reported => '신고가 접수됐어요. 확인 후 조치할게요.';

  @override
  String get removeMine => '내 집 비우기';

  @override
  String get removeAsOwner => '마을 주인으로 이 집 비우기';

  @override
  String get removeConfirm => '이 집을 비울까요? 사진과 메시지가 함께 지워져요.';

  @override
  String get cancel => '취소';

  @override
  String get removeButton => '집 비우기';

  @override
  String get photoLoadFailed => '사진을 불러오지 못했어요.';

  @override
  String get inviteTitle => '친구 초대';

  @override
  String inviteBody(int count) {
    return '친구를 초대해 마을을 완성해요. 빈 집이 $count채 남았어요.';
  }

  @override
  String get copyLink => '링크 복사';

  @override
  String get linkCopied => '초대 링크를 복사했어요.';

  @override
  String get shareLink => '공유하기';

  @override
  String get inviteNote =>
      '링크를 받은 사람은 누구나 마을을 구경하고 빈 집에 입주할 수 있어요. 믿을 수 있는 친구에게만 보내 주세요.';

  @override
  String shareText(String url) {
    return '우리 겨울 마을에 집을 지어 줘! $url';
  }

  @override
  String litUp(String name) {
    return '$name님의 집에 불이 켜졌어요!';
  }

  @override
  String get photoFailedAfterClaim =>
      '집은 완성됐지만 사진을 올리지 못했어요. 내 집을 눌러 다시 올려 주세요.';

  @override
  String get alreadyHaveHouse => '이미 이 마을에 내 집이 있어요. 친구를 초대해 빈 집을 채워 주세요!';

  @override
  String houseRemoved(String name) {
    return '$name님의 집을 비웠어요.';
  }

  @override
  String get openLinkTitle => '초대 링크로 마을 열기';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => '열기';

  @override
  String get linkInvalid => '초대 링크를 확인해 주세요.';

  @override
  String get nameRequired => '마을 이름을 입력해 주세요.';

  @override
  String get nameTooLong => '마을 이름은 20자 이내로 적어 주세요.';

  @override
  String get nicknameRequired => '닉네임을 입력해 주세요.';

  @override
  String get nicknameTooLong => '닉네임은 10자 이내로 적어 주세요.';

  @override
  String get messageTooLong => '메시지는 60자 이내로 적어 주세요.';

  @override
  String get errRateLimited => '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';

  @override
  String get errNetwork => '연결이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.';

  @override
  String get errForbidden => '이 작업을 할 권한이 없어요.';

  @override
  String get errPhotoTooLarge => '사진 용량이 너무 커요.';

  @override
  String get errPhotoUnsupported => '지원하지 않는 사진 형식이에요.';

  @override
  String get errNotFound => '대상을 찾을 수 없어요.';

  @override
  String get errServer => '일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';

  @override
  String get errSlotTaken =>
      '앗, 방금 다른 친구가 이 집터에 먼저 입주했어요. 작성한 내용은 그대로 두었으니 다른 빈 집을 골라 주세요.';

  @override
  String get errVillageFull => '마을의 열린 집터가 모두 찼어요. 마을을 넓히거나 새 마을을 만들어 보세요.';

  @override
  String get errAlreadyJoined => '이 기기에서는 이미 이 마을에 집을 만들었어요.';

  @override
  String get errNoServer => '서버 설정이 없어요. (개발용 빌드)';

  @override
  String milestoneHint(int remaining, String reward) {
    return '친구 $remaining명이 더 입주하면 「$reward」이(가) 생겨요 🎁';
  }

  @override
  String get decorSled => '선물 썰매';

  @override
  String get decorSnowFamily => '눈사람 가족';

  @override
  String get decorAurora => '오로라 하늘';

  @override
  String get growBig => '마을 넓히기';

  @override
  String upgradePointLots(int count) {
    return '잠긴 빈 집 $count채가 열려요.';
  }

  @override
  String upgradePointAurora(int big) {
    return '$big채가 모두 차면 하늘에 오로라가 떠요.';
  }

  @override
  String get upgradePointGift => '마을 주인이 아니어도 넓혀 줄 수 있고, 넓히면 웹과 앱의 모두에게 적용돼요.';

  @override
  String get useCredit => '보유한 이용권으로 넓히기';

  @override
  String get upgradeWaiting => '결제를 확인하는 중이에요…';

  @override
  String get restorePurchases => '구매 복원';

  @override
  String get restored => '구매 내역을 다시 불러왔어요.';

  @override
  String get purchasesUnavailable => '결제 준비 중이에요';

  @override
  String get errNoCredit => '사용할 수 있는 이용권이 없어요.';

  @override
  String get errAlreadyBig => '이미 가장 큰 마을(60채)이에요.';

  @override
  String get errPurchaseFailed => '결제를 완료하지 못했어요. 다시 시도해 주세요.';

  @override
  String get errPurchasePending =>
      '결제는 됐지만 확인이 늦어지고 있어요. 잠시 후 다시 열면 자동으로 적용돼요.';

  @override
  String get tapHintFull => '집을 눌러 친구들의 사진 액자를 열어 보세요.';

  @override
  String get doorDirection => '문 방향';

  @override
  String get dirFrontLeft => '왼쪽 앞';

  @override
  String get dirFrontRight => '오른쪽 앞';

  @override
  String get dirBackRight => '오른쪽 뒤';

  @override
  String get dirBackLeft => '왼쪽 뒤';

  @override
  String get dirTowardCentre => '동네 가운데 쪽';

  @override
  String districtOpened(String name) {
    return '$name에 집터 3곳이 열렸어요!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (아직 열리지 않음) · 마을 넓히기로 열기';
  }

  @override
  String expandBody(int capacity, int step) {
    return '지금 집 $capacity채 마을이에요. 동네를 고르면 집터 $step곳이 열려요 (한 동네는 6채, 두 번에 걸쳐 열려요).';
  }

  @override
  String get pickDistrict => '열 동네';

  @override
  String get districtNew => '새 동네 · 3채';

  @override
  String get districtHalf => '반쯤 열림 · 나머지 3채';

  @override
  String buyDistrict(String price) {
    return '$price에 넓히기';
  }

  @override
  String priceLadder(String p1, String p2, String p3, String p4, int max) {
    return '무료 6채 → 9채 $p1 → 12채 $p2 → 15채 $p3 → 그 뒤 3채마다 $p4 (최대 $max채)';
  }

  @override
  String maxVillage(int max) {
    return '이미 가장 큰 마을($max채)이에요';
  }
}
