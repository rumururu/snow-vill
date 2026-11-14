// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => '和朋友一起打造的\n专属冬日小镇';

  @override
  String get createVillage => '创建新小镇';

  @override
  String get openByLink => '用邀请链接打开小镇';

  @override
  String get myVillages => '我的小镇';

  @override
  String get noVillages => '还没有小镇哦。创建一个新的，或打开朋友发来的邀请链接吧。';

  @override
  String get privacyPolicy => '隐私政策';

  @override
  String get createHeading => '给小镇起个名字吧';

  @override
  String get villageNameHint => '例如：雪花小镇';

  @override
  String get createCapacity => '最多 6 位朋友可免费入住。';

  @override
  String get createButton => '创建小镇';

  @override
  String get creating => '创建中…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return '还能入住 $count 栋';
  }

  @override
  String get villageComplete => '小镇建成啦';

  @override
  String get makeMyHouse => '建造我的家';

  @override
  String get myHouse => '查看我的家';

  @override
  String get invite => '邀请朋友';

  @override
  String get deleteVillage => '删除小镇';

  @override
  String get deleteConfirmTitle => '要删除这个小镇吗？';

  @override
  String deleteConfirmBody(int count) {
    return '$count 栋房子及所有照片、留言都将被永久删除，无法恢复。';
  }

  @override
  String get deleteButton => '删除小镇和所有房子';

  @override
  String get loadFailed => '无法加载小镇';

  @override
  String get retry => '重试';

  @override
  String get notFoundTitle => '找不到这个小镇';

  @override
  String get notFoundBody => '链接可能有误，或小镇已被删除。';

  @override
  String claimTitle(int slot) {
    return '在 $slot 号地块建造我的家';
  }

  @override
  String get firstHouseIntro => '小镇建好啦！要建第一栋房子，点亮灯光吗？';

  @override
  String get nickname => '昵称';

  @override
  String get nicknameHint => '朋友能认出你的名字';

  @override
  String get houseStyle => '房屋类型';

  @override
  String get photo => '照片';

  @override
  String get optional => '（可选）';

  @override
  String get choosePhoto => '选择照片';

  @override
  String get changePhoto => '更换照片';

  @override
  String get addPhoto => '上传照片';

  @override
  String get removePhoto => '移除照片';

  @override
  String get message => '留言';

  @override
  String get messageHint => '给小镇朋友们的一句话';

  @override
  String get visibilityNote => '你填写的昵称、留言和照片，所有拥有此小镇链接的人都能看到。';

  @override
  String get submitHouse => '完成我的家';

  @override
  String get submitting => '建造中…';

  @override
  String moveToSlot(int slot) {
    return '搬到 $slot 号空地';
  }

  @override
  String frameTitle(String name) {
    return '$name的小房子';
  }

  @override
  String get noMessage => '没有留言。';

  @override
  String joinedOn(String date) {
    return '$date 入住';
  }

  @override
  String get report => '举报不当内容';

  @override
  String get reported => '已收到举报，我们会尽快核实处理。';

  @override
  String get removeMine => '清空我的家';

  @override
  String get removeAsOwner => '以镇主身份清空此房子';

  @override
  String get removeConfirm => '要清空这栋房子吗？照片和留言也会一并删除。';

  @override
  String get cancel => '取消';

  @override
  String get removeButton => '清空房子';

  @override
  String get photoLoadFailed => '无法加载照片。';

  @override
  String get inviteTitle => '邀请朋友';

  @override
  String inviteBody(int count) {
    return '还剩 $count 栋空房子。';
  }

  @override
  String get copyLink => '复制链接';

  @override
  String get linkCopied => '邀请链接已复制。';

  @override
  String get shareLink => '分享';

  @override
  String get inviteNote => '请只发给信任的朋友。';

  @override
  String shareText(String url) {
    return '来我们的冬日小镇盖房子吧！$url';
  }

  @override
  String litUp(String name) {
    return '$name的房子亮灯啦！';
  }

  @override
  String get photoFailedAfterClaim => '房子已建好，但照片上传失败。点一下你的家再试一次吧。';

  @override
  String get alreadyHaveHouse => '你在这个小镇已经有家了。';

  @override
  String houseRemoved(String name) {
    return '已清空$name的房子。';
  }

  @override
  String get openLinkTitle => '用邀请链接打开小镇';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => '打开';

  @override
  String get linkInvalid => '请检查邀请链接。';

  @override
  String get nameRequired => '请输入小镇名称。';

  @override
  String get nameTooLong => '小镇名称请不超过 20 个字。';

  @override
  String get nicknameRequired => '请输入昵称。';

  @override
  String get nicknameTooLong => '昵称请不超过 10 个字。';

  @override
  String get messageTooLong => '留言请不超过 60 个字。';

  @override
  String get errRateLimited => '请求过于频繁，请稍后再试。';

  @override
  String get errNetwork => '网络已断开，请检查网络后重试。';

  @override
  String get errForbidden => '你没有执行此操作的权限。';

  @override
  String get errPhotoTooLarge => '照片太大了。';

  @override
  String get errPhotoUnsupported => '不支持该照片格式。';

  @override
  String get errNotFound => '未找到。';

  @override
  String get errServer => '出了点问题，请稍后再试。';

  @override
  String get errSlotTaken => '哎呀，刚刚有朋友抢先入住了这块地。你填写的内容已保留，请换一个空房子吧。';

  @override
  String get errVillageFull => '已开放的地块都住满了。扩建小镇或创建新小镇吧。';

  @override
  String get errAlreadyJoined => '这台设备已经在这个小镇建过房子了。';

  @override
  String get errNoServer => '未配置服务器（开发版本）。';

  @override
  String milestoneHint(int remaining, String reward) {
    return '再有 $remaining 位朋友入住，就会出现「$reward」🎁';
  }

  @override
  String get decorAurora => '极光夜空';

  @override
  String get growBig => '扩建小镇';

  @override
  String get useCredit => '使用已有的扩建券';

  @override
  String get upgradeWaiting => '正在确认购买…';

  @override
  String get restorePurchases => '恢复购买';

  @override
  String get restored => '已恢复购买记录。';

  @override
  String get purchasesUnavailable => '购买功能即将上线';

  @override
  String get errNoCredit => '没有可用的扩建券。';

  @override
  String get errAlreadyBig => '已经是最大的小镇了（60 栋）。';

  @override
  String get errPurchaseFailed => '购买未完成，请重试。';

  @override
  String get errPurchasePending => '已付款，但确认有些延迟。稍后重新打开即会自动生效。';

  @override
  String get doorDirection => '门的朝向';

  @override
  String get dirFrontLeft => '左前';

  @override
  String get dirFrontRight => '右前';

  @override
  String get dirBackRight => '右后';

  @override
  String get dirBackLeft => '左后';

  @override
  String get dirTowardCentre => '朝向巷子中央';

  @override
  String districtOpened(String name) {
    return '$name开放了 3 块地！';
  }

  @override
  String lockedDistrict(String name) {
    return '$name（尚未开放）· 扩建小镇即可开放';
  }

  @override
  String get pickDistrict => '要开放哪条巷子？';

  @override
  String get districtHalf => '已开放一半';

  @override
  String buyDistrict(String price) {
    return '$price 扩建';
  }

  @override
  String maxVillage(int max) {
    return '已经是最大的小镇了（$max 栋）';
  }

  @override
  String get editLook => '🎨 装饰';

  @override
  String get editLookMenu => '装饰小镇（道路·装饰）';

  @override
  String get pathStyleTitle => '道路';

  @override
  String get pathDirt => '土路';

  @override
  String get pathStones => '踏脚石';

  @override
  String get pathBrick => '砖路';

  @override
  String get pathSnow => '雪路';

  @override
  String get lookHint => '拖动装饰下方的圆圈来移动它。';

  @override
  String get resetDecor => '装饰恢复原位';

  @override
  String get saveLook => '保存';

  @override
  String get savingLook => '保存中…';

  @override
  String get lookSaved => '小镇装饰已保存。';

  @override
  String get signIn => '登录';

  @override
  String get continueWithGoogle => '通过 Google 继续';

  @override
  String get continueWithApple => '通过 Apple 继续';

  @override
  String get signOut => '退出登录';

  @override
  String get deleteAccount => '删除账号';

  @override
  String get deleteAccountTitle => '要删除账号吗？';

  @override
  String get deleteAccountBody => '村庄、房子和照片都会被删除，且无法恢复。';

  @override
  String get deleteAccountButton => '删除';

  @override
  String get accountDeleted => '账号已删除。';

  @override
  String get errSignIn => '登录失败，请重试。';

  @override
  String get privateVillage => '私密村庄';

  @override
  String get members => '成员';

  @override
  String get requestJoin => '申请入住';

  @override
  String get joinPending => '正在等待批准';

  @override
  String get approve => '批准';

  @override
  String get decline => '拒绝';

  @override
  String get removeMember => '移出';

  @override
  String get noMembers => '还没有人';
}
