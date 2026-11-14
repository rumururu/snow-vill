// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => '友だちとつくる\nわたしたちの冬の村';

  @override
  String get createVillage => '新しい村をつくる';

  @override
  String get openByLink => '招待リンクで村を開く';

  @override
  String get myVillages => 'わたしの村';

  @override
  String get noVillages => 'まだ村がありません。新しい村をつくるか、友だちからの招待リンクを開いてみてください。';

  @override
  String get privacyPolicy => 'プライバシーポリシー';

  @override
  String get createHeading => '村の名前は？';

  @override
  String get villageNameHint => '例：雪の結晶村';

  @override
  String get createCapacity => '友だち6人まで無料で入居できます。';

  @override
  String get createButton => '村をつくる';

  @override
  String get creating => '作成中…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'あと$count軒入居できます';
  }

  @override
  String get villageComplete => '村が完成しました';

  @override
  String get makeMyHouse => '自分の家をつくる';

  @override
  String get myHouse => '自分の家を見る';

  @override
  String get invite => '友だちを招待';

  @override
  String get deleteVillage => '村を削除';

  @override
  String get deleteConfirmTitle => '村を削除しますか？';

  @override
  String deleteConfirmBody(int count) {
    return '$count軒の家と写真、メッセージがすべて消え、元に戻せません。';
  }

  @override
  String get deleteButton => '村とすべての家を削除';

  @override
  String get loadFailed => '村を読み込めませんでした';

  @override
  String get retry => 'もう一度';

  @override
  String get notFoundTitle => '村が見つかりません';

  @override
  String get notFoundBody => 'リンクが間違っているか、村が削除された可能性があります。';

  @override
  String claimTitle(int slot) {
    return '$slot番の区画に家をつくる';
  }

  @override
  String get firstHouseIntro => '村ができました！最初の家を建てて、明かりをつけてみませんか？';

  @override
  String get nickname => 'ニックネーム';

  @override
  String get nicknameHint => '友だちがわかる名前';

  @override
  String get houseStyle => '家の形';

  @override
  String get styleWood => '木';

  @override
  String get styleSage => 'セージ';

  @override
  String get styleIndigo => 'インディゴ';

  @override
  String get photo => '写真';

  @override
  String get optional => '（任意）';

  @override
  String get choosePhoto => '写真を選ぶ';

  @override
  String get changePhoto => '写真を変える';

  @override
  String get addPhoto => '写真を追加';

  @override
  String get removePhoto => '写真を外す';

  @override
  String get message => 'ひとこと';

  @override
  String get messageHint => '村の友だちへのひとこと';

  @override
  String get visibilityNote => 'ニックネーム・ひとこと・写真は、この村のリンクを持つ人に表示されます。';

  @override
  String get submitHouse => '家を完成させる';

  @override
  String get submitting => '建設中…';

  @override
  String moveToSlot(int slot) {
    return '$slot番の空き区画へ移る';
  }

  @override
  String frameTitle(String name) {
    return '$nameの小さな家';
  }

  @override
  String get noMessage => 'メッセージはありません。';

  @override
  String joinedOn(String date) {
    return '$date 入居';
  }

  @override
  String get report => '不適切な内容を通報';

  @override
  String get reported => '通報を受け付けました。確認のうえ対応します。';

  @override
  String get removeMine => '自分の家を空ける';

  @override
  String get removeAsOwner => '村のオーナーとしてこの家を空ける';

  @override
  String get removeConfirm => 'この家を空けますか？写真とメッセージも消えます。';

  @override
  String get cancel => 'キャンセル';

  @override
  String get removeButton => '家を空ける';

  @override
  String get photoLoadFailed => '写真を読み込めませんでした。';

  @override
  String get inviteTitle => '友だちを招待';

  @override
  String inviteBody(int count) {
    return '空き家はあと$count軒です。';
  }

  @override
  String get copyLink => 'リンクをコピー';

  @override
  String get linkCopied => '招待リンクをコピーしました。';

  @override
  String get shareLink => '共有';

  @override
  String get inviteNote => '信頼できる友だちにだけ送ってください。';

  @override
  String shareText(String url) {
    return 'わたしたちの冬の村に家を建てて！ $url';
  }

  @override
  String litUp(String name) {
    return '$nameさんの家に明かりがともりました！';
  }

  @override
  String get photoFailedAfterClaim =>
      '家は完成しましたが、写真をアップロードできませんでした。自分の家をタップして、もう一度アップロードしてください。';

  @override
  String get alreadyHaveHouse => 'この村にはもう自分の家があります。';

  @override
  String houseRemoved(String name) {
    return '$nameさんの家を空けました。';
  }

  @override
  String get openLinkTitle => '招待リンクで村を開く';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => '開く';

  @override
  String get linkInvalid => '招待リンクを確認してください。';

  @override
  String get nameRequired => '村の名前を入力してください。';

  @override
  String get nameTooLong => '村の名前は20文字以内にしてください。';

  @override
  String get nicknameRequired => 'ニックネームを入力してください。';

  @override
  String get nicknameTooLong => 'ニックネームは10文字以内にしてください。';

  @override
  String get messageTooLong => 'メッセージは60文字以内にしてください。';

  @override
  String get errRateLimited => 'リクエストが多すぎます。少し待ってからもう一度お試しください。';

  @override
  String get errNetwork => '接続が切れました。ネットワークを確認してもう一度お試しください。';

  @override
  String get errForbidden => 'この操作を行う権限がありません。';

  @override
  String get errPhotoTooLarge => '写真のサイズが大きすぎます。';

  @override
  String get errPhotoUnsupported => '対応していない写真形式です。';

  @override
  String get errNotFound => '見つかりません。';

  @override
  String get errServer => '一時的な問題が発生しました。少し待ってからもう一度お試しください。';

  @override
  String get errSlotTaken =>
      'あっ、たった今ほかの友だちがこの区画に入居しました。入力内容はそのまま残っているので、別の空き家を選んでください。';

  @override
  String get errVillageFull => '開いている区画はすべて埋まりました。村を広げるか、新しい村をつくってみてください。';

  @override
  String get errAlreadyJoined => 'この端末では、すでにこの村に家をつくっています。';

  @override
  String get errNoServer => 'サーバーが設定されていません（開発用ビルド）。';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'あと$remaining人入居すると「$reward」が登場 🎁';
  }

  @override
  String get decorSled => 'プレゼントのそり';

  @override
  String get decorSnowFamily => '雪だるま家族';

  @override
  String get decorAurora => 'オーロラの空';

  @override
  String get growBig => '村を広げる';

  @override
  String upgradePointLots(int count) {
    return 'ロック中の区画が$countつ開きます。';
  }

  @override
  String get useCredit => '持っている利用券で広げる';

  @override
  String get upgradeWaiting => '購入を確認しています…';

  @override
  String get restorePurchases => '購入を復元';

  @override
  String get restored => '購入履歴を復元しました。';

  @override
  String get purchasesUnavailable => '購入は準備中です';

  @override
  String get errNoCredit => '使える利用券がありません。';

  @override
  String get errAlreadyBig => 'すでに最大の村（60軒）です。';

  @override
  String get errPurchaseFailed => '購入を完了できませんでした。もう一度お試しください。';

  @override
  String get errPurchasePending =>
      '支払いは完了しましたが、確認に時間がかかっています。少ししてから開き直すと自動で反映されます。';

  @override
  String get doorDirection => 'ドアの向き';

  @override
  String get dirFrontLeft => '左前';

  @override
  String get dirFrontRight => '右前';

  @override
  String get dirBackRight => '右奥';

  @override
  String get dirBackLeft => '左奥';

  @override
  String get dirTowardCentre => '通りの中心へ';

  @override
  String districtOpened(String name) {
    return '$nameに区画が3つ開きました！';
  }

  @override
  String lockedDistrict(String name) {
    return '$name（未開放）· 村を広げると開きます';
  }

  @override
  String get pickDistrict => 'どの通りを開きますか？';

  @override
  String get districtHalf => '半分開放';

  @override
  String buyDistrict(String price) {
    return '$priceで広げる';
  }

  @override
  String maxVillage(int max) {
    return 'すでに最大の村（$max軒）です';
  }

  @override
  String get editLook => '🎨 飾る';

  @override
  String get editLookMenu => '村を飾る（道・飾り）';

  @override
  String get pathStyleTitle => '道';

  @override
  String get pathDirt => '土の道';

  @override
  String get pathStones => '飛び石';

  @override
  String get pathBrick => 'レンガ道';

  @override
  String get pathSnow => '雪道';

  @override
  String get lookHint => '飾りの下の丸をドラッグして動かします。';

  @override
  String get resetDecor => '飾りを元の位置に';

  @override
  String get saveLook => '保存';

  @override
  String get savingLook => '保存中…';

  @override
  String get lookSaved => '村の飾りを保存しました。';
}
