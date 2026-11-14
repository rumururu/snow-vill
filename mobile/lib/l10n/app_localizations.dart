import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_id.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_ko.dart';
import 'app_localizations_pt.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('id'),
    Locale('ja'),
    Locale('ko'),
    Locale('pt'),
    Locale('ru'),
    Locale('zh'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In ko, this message translates to:
  /// **'Snow Village'**
  String get appTitle;

  /// No description provided for @tagline.
  ///
  /// In ko, this message translates to:
  /// **'친구들과 만드는\n우리만의 겨울 마을'**
  String get tagline;

  /// No description provided for @createVillage.
  ///
  /// In ko, this message translates to:
  /// **'새 마을 만들기'**
  String get createVillage;

  /// No description provided for @openByLink.
  ///
  /// In ko, this message translates to:
  /// **'초대 링크로 마을 열기'**
  String get openByLink;

  /// No description provided for @myVillages.
  ///
  /// In ko, this message translates to:
  /// **'내 마을'**
  String get myVillages;

  /// No description provided for @noVillages.
  ///
  /// In ko, this message translates to:
  /// **'아직 마을이 없어요. 새 마을을 만들거나 친구에게 받은 초대 링크를 열어 보세요.'**
  String get noVillages;

  /// No description provided for @privacyPolicy.
  ///
  /// In ko, this message translates to:
  /// **'개인정보처리방침'**
  String get privacyPolicy;

  /// No description provided for @createHeading.
  ///
  /// In ko, this message translates to:
  /// **'우리 마을의 이름은?'**
  String get createHeading;

  /// No description provided for @villageNameHint.
  ///
  /// In ko, this message translates to:
  /// **'예: 눈송이 마을'**
  String get villageNameHint;

  /// No description provided for @createCapacity.
  ///
  /// In ko, this message translates to:
  /// **'친구 6명까지 무료로 입주할 수 있어요.'**
  String get createCapacity;

  /// No description provided for @createButton.
  ///
  /// In ko, this message translates to:
  /// **'마을 생성하기'**
  String get createButton;

  /// No description provided for @creating.
  ///
  /// In ko, this message translates to:
  /// **'만드는 중…'**
  String get creating;

  /// No description provided for @occupancy.
  ///
  /// In ko, this message translates to:
  /// **'{count}/{capacity}'**
  String occupancy(int count, int capacity);

  /// No description provided for @freeHouses.
  ///
  /// In ko, this message translates to:
  /// **'{count}채 더 입주할 수 있어요'**
  String freeHouses(int count);

  /// No description provided for @villageComplete.
  ///
  /// In ko, this message translates to:
  /// **'마을이 완성됐어요'**
  String get villageComplete;

  /// No description provided for @makeMyHouse.
  ///
  /// In ko, this message translates to:
  /// **'내 집 만들기'**
  String get makeMyHouse;

  /// No description provided for @myHouse.
  ///
  /// In ko, this message translates to:
  /// **'내 집 보기'**
  String get myHouse;

  /// No description provided for @invite.
  ///
  /// In ko, this message translates to:
  /// **'친구 초대'**
  String get invite;

  /// No description provided for @deleteVillage.
  ///
  /// In ko, this message translates to:
  /// **'마을 삭제'**
  String get deleteVillage;

  /// No description provided for @deleteConfirmTitle.
  ///
  /// In ko, this message translates to:
  /// **'마을을 삭제할까요?'**
  String get deleteConfirmTitle;

  /// No description provided for @deleteConfirmBody.
  ///
  /// In ko, this message translates to:
  /// **'집 {count}채와 사진, 메시지가 모두 지워지고 되돌릴 수 없어요.'**
  String deleteConfirmBody(int count);

  /// No description provided for @deleteButton.
  ///
  /// In ko, this message translates to:
  /// **'마을과 모든 집 삭제하기'**
  String get deleteButton;

  /// No description provided for @loadFailed.
  ///
  /// In ko, this message translates to:
  /// **'마을을 불러오지 못했어요'**
  String get loadFailed;

  /// No description provided for @retry.
  ///
  /// In ko, this message translates to:
  /// **'다시 시도'**
  String get retry;

  /// No description provided for @notFoundTitle.
  ///
  /// In ko, this message translates to:
  /// **'마을을 찾을 수 없어요'**
  String get notFoundTitle;

  /// No description provided for @notFoundBody.
  ///
  /// In ko, this message translates to:
  /// **'링크가 잘못되었거나 마을이 삭제되었을 수 있어요.'**
  String get notFoundBody;

  /// No description provided for @claimTitle.
  ///
  /// In ko, this message translates to:
  /// **'{slot}번 집터에 내 집 만들기'**
  String claimTitle(int slot);

  /// No description provided for @firstHouseIntro.
  ///
  /// In ko, this message translates to:
  /// **'마을이 생겼어요! 첫 번째 집을 지어 불을 켜 볼까요?'**
  String get firstHouseIntro;

  /// No description provided for @nickname.
  ///
  /// In ko, this message translates to:
  /// **'닉네임'**
  String get nickname;

  /// No description provided for @nicknameHint.
  ///
  /// In ko, this message translates to:
  /// **'친구들이 알아볼 이름'**
  String get nicknameHint;

  /// No description provided for @houseStyle.
  ///
  /// In ko, this message translates to:
  /// **'집 모양'**
  String get houseStyle;

  /// No description provided for @photo.
  ///
  /// In ko, this message translates to:
  /// **'사진'**
  String get photo;

  /// No description provided for @optional.
  ///
  /// In ko, this message translates to:
  /// **'(선택)'**
  String get optional;

  /// No description provided for @choosePhoto.
  ///
  /// In ko, this message translates to:
  /// **'사진 고르기'**
  String get choosePhoto;

  /// No description provided for @changePhoto.
  ///
  /// In ko, this message translates to:
  /// **'사진 바꾸기'**
  String get changePhoto;

  /// No description provided for @addPhoto.
  ///
  /// In ko, this message translates to:
  /// **'사진 올리기'**
  String get addPhoto;

  /// No description provided for @removePhoto.
  ///
  /// In ko, this message translates to:
  /// **'사진 빼기'**
  String get removePhoto;

  /// No description provided for @message.
  ///
  /// In ko, this message translates to:
  /// **'한마디'**
  String get message;

  /// No description provided for @messageHint.
  ///
  /// In ko, this message translates to:
  /// **'마을 친구들에게 남길 한마디'**
  String get messageHint;

  /// No description provided for @visibilityNote.
  ///
  /// In ko, this message translates to:
  /// **'입력한 닉네임·한마디·사진은 이 마을 링크를 가진 사람에게 보여요.'**
  String get visibilityNote;

  /// No description provided for @submitHouse.
  ///
  /// In ko, this message translates to:
  /// **'내 집 완성하기'**
  String get submitHouse;

  /// No description provided for @submitting.
  ///
  /// In ko, this message translates to:
  /// **'집 짓는 중…'**
  String get submitting;

  /// No description provided for @moveToSlot.
  ///
  /// In ko, this message translates to:
  /// **'{slot}번 빈 집터로 옮기기'**
  String moveToSlot(int slot);

  /// No description provided for @frameTitle.
  ///
  /// In ko, this message translates to:
  /// **'{name}의 작은 집'**
  String frameTitle(String name);

  /// No description provided for @noMessage.
  ///
  /// In ko, this message translates to:
  /// **'남긴 메시지가 없어요.'**
  String get noMessage;

  /// No description provided for @joinedOn.
  ///
  /// In ko, this message translates to:
  /// **'{date} 입주'**
  String joinedOn(String date);

  /// No description provided for @report.
  ///
  /// In ko, this message translates to:
  /// **'부적절한 내용 신고하기'**
  String get report;

  /// No description provided for @reported.
  ///
  /// In ko, this message translates to:
  /// **'신고가 접수됐어요. 확인 후 조치할게요.'**
  String get reported;

  /// No description provided for @removeMine.
  ///
  /// In ko, this message translates to:
  /// **'내 집 비우기'**
  String get removeMine;

  /// No description provided for @removeAsOwner.
  ///
  /// In ko, this message translates to:
  /// **'마을 주인으로 이 집 비우기'**
  String get removeAsOwner;

  /// No description provided for @removeConfirm.
  ///
  /// In ko, this message translates to:
  /// **'이 집을 비울까요? 사진과 메시지가 함께 지워져요.'**
  String get removeConfirm;

  /// No description provided for @cancel.
  ///
  /// In ko, this message translates to:
  /// **'취소'**
  String get cancel;

  /// No description provided for @removeButton.
  ///
  /// In ko, this message translates to:
  /// **'집 비우기'**
  String get removeButton;

  /// No description provided for @photoLoadFailed.
  ///
  /// In ko, this message translates to:
  /// **'사진을 불러오지 못했어요.'**
  String get photoLoadFailed;

  /// No description provided for @inviteTitle.
  ///
  /// In ko, this message translates to:
  /// **'친구 초대'**
  String get inviteTitle;

  /// No description provided for @inviteBody.
  ///
  /// In ko, this message translates to:
  /// **'빈 집이 {count}채 남았어요.'**
  String inviteBody(int count);

  /// No description provided for @copyLink.
  ///
  /// In ko, this message translates to:
  /// **'링크 복사'**
  String get copyLink;

  /// No description provided for @linkCopied.
  ///
  /// In ko, this message translates to:
  /// **'초대 링크를 복사했어요.'**
  String get linkCopied;

  /// No description provided for @shareLink.
  ///
  /// In ko, this message translates to:
  /// **'공유하기'**
  String get shareLink;

  /// No description provided for @inviteNote.
  ///
  /// In ko, this message translates to:
  /// **'믿을 수 있는 친구에게만 보내 주세요.'**
  String get inviteNote;

  /// No description provided for @shareText.
  ///
  /// In ko, this message translates to:
  /// **'우리 겨울 마을에 집을 지어 줘! {url}'**
  String shareText(String url);

  /// No description provided for @litUp.
  ///
  /// In ko, this message translates to:
  /// **'{name}님의 집에 불이 켜졌어요!'**
  String litUp(String name);

  /// No description provided for @photoFailedAfterClaim.
  ///
  /// In ko, this message translates to:
  /// **'집은 완성됐지만 사진을 올리지 못했어요. 내 집을 눌러 다시 올려 주세요.'**
  String get photoFailedAfterClaim;

  /// No description provided for @alreadyHaveHouse.
  ///
  /// In ko, this message translates to:
  /// **'이미 이 마을에 내 집이 있어요.'**
  String get alreadyHaveHouse;

  /// No description provided for @houseRemoved.
  ///
  /// In ko, this message translates to:
  /// **'{name}님의 집을 비웠어요.'**
  String houseRemoved(String name);

  /// No description provided for @openLinkTitle.
  ///
  /// In ko, this message translates to:
  /// **'초대 링크로 마을 열기'**
  String get openLinkTitle;

  /// No description provided for @openLinkHint.
  ///
  /// In ko, this message translates to:
  /// **'https://snow.mkideabox.com/v/?id=…'**
  String get openLinkHint;

  /// No description provided for @openButton.
  ///
  /// In ko, this message translates to:
  /// **'열기'**
  String get openButton;

  /// No description provided for @linkInvalid.
  ///
  /// In ko, this message translates to:
  /// **'초대 링크를 확인해 주세요.'**
  String get linkInvalid;

  /// No description provided for @nameRequired.
  ///
  /// In ko, this message translates to:
  /// **'마을 이름을 입력해 주세요.'**
  String get nameRequired;

  /// No description provided for @nameTooLong.
  ///
  /// In ko, this message translates to:
  /// **'마을 이름은 20자 이내로 적어 주세요.'**
  String get nameTooLong;

  /// No description provided for @nicknameRequired.
  ///
  /// In ko, this message translates to:
  /// **'닉네임을 입력해 주세요.'**
  String get nicknameRequired;

  /// No description provided for @nicknameTooLong.
  ///
  /// In ko, this message translates to:
  /// **'닉네임은 10자 이내로 적어 주세요.'**
  String get nicknameTooLong;

  /// No description provided for @messageTooLong.
  ///
  /// In ko, this message translates to:
  /// **'메시지는 60자 이내로 적어 주세요.'**
  String get messageTooLong;

  /// No description provided for @errRateLimited.
  ///
  /// In ko, this message translates to:
  /// **'요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'**
  String get errRateLimited;

  /// No description provided for @errNetwork.
  ///
  /// In ko, this message translates to:
  /// **'연결이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.'**
  String get errNetwork;

  /// No description provided for @errForbidden.
  ///
  /// In ko, this message translates to:
  /// **'이 작업을 할 권한이 없어요.'**
  String get errForbidden;

  /// No description provided for @errPhotoTooLarge.
  ///
  /// In ko, this message translates to:
  /// **'사진 용량이 너무 커요.'**
  String get errPhotoTooLarge;

  /// No description provided for @errPhotoUnsupported.
  ///
  /// In ko, this message translates to:
  /// **'지원하지 않는 사진 형식이에요.'**
  String get errPhotoUnsupported;

  /// No description provided for @errNotFound.
  ///
  /// In ko, this message translates to:
  /// **'대상을 찾을 수 없어요.'**
  String get errNotFound;

  /// No description provided for @errServer.
  ///
  /// In ko, this message translates to:
  /// **'일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'**
  String get errServer;

  /// No description provided for @errSlotTaken.
  ///
  /// In ko, this message translates to:
  /// **'앗, 방금 다른 친구가 이 집터에 먼저 입주했어요. 작성한 내용은 그대로 두었으니 다른 빈 집을 골라 주세요.'**
  String get errSlotTaken;

  /// No description provided for @errVillageFull.
  ///
  /// In ko, this message translates to:
  /// **'마을의 열린 집터가 모두 찼어요. 마을을 넓히거나 새 마을을 만들어 보세요.'**
  String get errVillageFull;

  /// No description provided for @errAlreadyJoined.
  ///
  /// In ko, this message translates to:
  /// **'이 기기에서는 이미 이 마을에 집을 만들었어요.'**
  String get errAlreadyJoined;

  /// No description provided for @errNoServer.
  ///
  /// In ko, this message translates to:
  /// **'서버 설정이 없어요. (개발용 빌드)'**
  String get errNoServer;

  /// No description provided for @milestoneHint.
  ///
  /// In ko, this message translates to:
  /// **'친구 {remaining}명이 더 입주하면 「{reward}」이(가) 생겨요 🎁'**
  String milestoneHint(int remaining, String reward);

  /// No description provided for @decorAurora.
  ///
  /// In ko, this message translates to:
  /// **'오로라 하늘'**
  String get decorAurora;

  /// No description provided for @growBig.
  ///
  /// In ko, this message translates to:
  /// **'마을 넓히기'**
  String get growBig;

  /// No description provided for @useCredit.
  ///
  /// In ko, this message translates to:
  /// **'보유한 이용권으로 넓히기'**
  String get useCredit;

  /// No description provided for @upgradeWaiting.
  ///
  /// In ko, this message translates to:
  /// **'결제를 확인하는 중이에요…'**
  String get upgradeWaiting;

  /// No description provided for @restorePurchases.
  ///
  /// In ko, this message translates to:
  /// **'구매 복원'**
  String get restorePurchases;

  /// No description provided for @restored.
  ///
  /// In ko, this message translates to:
  /// **'구매 내역을 다시 불러왔어요.'**
  String get restored;

  /// No description provided for @purchasesUnavailable.
  ///
  /// In ko, this message translates to:
  /// **'결제 준비 중이에요'**
  String get purchasesUnavailable;

  /// No description provided for @errNoCredit.
  ///
  /// In ko, this message translates to:
  /// **'사용할 수 있는 이용권이 없어요.'**
  String get errNoCredit;

  /// No description provided for @errAlreadyBig.
  ///
  /// In ko, this message translates to:
  /// **'이미 가장 큰 마을(60채)이에요.'**
  String get errAlreadyBig;

  /// No description provided for @errPurchaseFailed.
  ///
  /// In ko, this message translates to:
  /// **'결제를 완료하지 못했어요. 다시 시도해 주세요.'**
  String get errPurchaseFailed;

  /// No description provided for @errPurchasePending.
  ///
  /// In ko, this message translates to:
  /// **'결제는 됐지만 확인이 늦어지고 있어요. 잠시 후 다시 열면 자동으로 적용돼요.'**
  String get errPurchasePending;

  /// No description provided for @doorDirection.
  ///
  /// In ko, this message translates to:
  /// **'문 방향'**
  String get doorDirection;

  /// No description provided for @dirFrontLeft.
  ///
  /// In ko, this message translates to:
  /// **'왼쪽 앞'**
  String get dirFrontLeft;

  /// No description provided for @dirFrontRight.
  ///
  /// In ko, this message translates to:
  /// **'오른쪽 앞'**
  String get dirFrontRight;

  /// No description provided for @dirBackRight.
  ///
  /// In ko, this message translates to:
  /// **'오른쪽 뒤'**
  String get dirBackRight;

  /// No description provided for @dirBackLeft.
  ///
  /// In ko, this message translates to:
  /// **'왼쪽 뒤'**
  String get dirBackLeft;

  /// No description provided for @dirTowardCentre.
  ///
  /// In ko, this message translates to:
  /// **'동네 가운데 쪽'**
  String get dirTowardCentre;

  /// No description provided for @districtOpened.
  ///
  /// In ko, this message translates to:
  /// **'{name}에 집터 3곳이 열렸어요!'**
  String districtOpened(String name);

  /// No description provided for @lockedDistrict.
  ///
  /// In ko, this message translates to:
  /// **'{name} (아직 열리지 않음) · 마을 넓히기로 열기'**
  String lockedDistrict(String name);

  /// No description provided for @pickDistrict.
  ///
  /// In ko, this message translates to:
  /// **'어느 동네를 열까요?'**
  String get pickDistrict;

  /// No description provided for @districtHalf.
  ///
  /// In ko, this message translates to:
  /// **'반쯤 열림'**
  String get districtHalf;

  /// No description provided for @buyDistrict.
  ///
  /// In ko, this message translates to:
  /// **'{price}에 넓히기'**
  String buyDistrict(String price);

  /// No description provided for @maxVillage.
  ///
  /// In ko, this message translates to:
  /// **'이미 가장 큰 마을({max}채)이에요'**
  String maxVillage(int max);

  /// No description provided for @editLook.
  ///
  /// In ko, this message translates to:
  /// **'🎨 꾸미기'**
  String get editLook;

  /// No description provided for @editLookMenu.
  ///
  /// In ko, this message translates to:
  /// **'마을 꾸미기 (길·장식)'**
  String get editLookMenu;

  /// No description provided for @pathStyleTitle.
  ///
  /// In ko, this message translates to:
  /// **'길 모양'**
  String get pathStyleTitle;

  /// No description provided for @pathDirt.
  ///
  /// In ko, this message translates to:
  /// **'흙길'**
  String get pathDirt;

  /// No description provided for @pathStones.
  ///
  /// In ko, this message translates to:
  /// **'디딤돌'**
  String get pathStones;

  /// No description provided for @pathBrick.
  ///
  /// In ko, this message translates to:
  /// **'벽돌길'**
  String get pathBrick;

  /// No description provided for @pathSnow.
  ///
  /// In ko, this message translates to:
  /// **'눈길'**
  String get pathSnow;

  /// No description provided for @lookHint.
  ///
  /// In ko, this message translates to:
  /// **'장식 아래 동그라미를 끌어서 옮겨요.'**
  String get lookHint;

  /// No description provided for @resetDecor.
  ///
  /// In ko, this message translates to:
  /// **'장식 처음 자리로'**
  String get resetDecor;

  /// No description provided for @saveLook.
  ///
  /// In ko, this message translates to:
  /// **'저장'**
  String get saveLook;

  /// No description provided for @savingLook.
  ///
  /// In ko, this message translates to:
  /// **'저장하는 중…'**
  String get savingLook;

  /// No description provided for @lookSaved.
  ///
  /// In ko, this message translates to:
  /// **'마을 꾸미기를 저장했어요.'**
  String get lookSaved;

  /// No description provided for @signIn.
  ///
  /// In ko, this message translates to:
  /// **'로그인'**
  String get signIn;

  /// No description provided for @continueWithGoogle.
  ///
  /// In ko, this message translates to:
  /// **'Google로 계속하기'**
  String get continueWithGoogle;

  /// No description provided for @continueWithApple.
  ///
  /// In ko, this message translates to:
  /// **'Apple로 계속하기'**
  String get continueWithApple;

  /// No description provided for @signOut.
  ///
  /// In ko, this message translates to:
  /// **'로그아웃'**
  String get signOut;

  /// No description provided for @deleteAccount.
  ///
  /// In ko, this message translates to:
  /// **'계정 삭제'**
  String get deleteAccount;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In ko, this message translates to:
  /// **'계정을 삭제할까요?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountBody.
  ///
  /// In ko, this message translates to:
  /// **'마을, 집, 사진이 모두 삭제되며 되돌릴 수 없어요.'**
  String get deleteAccountBody;

  /// No description provided for @deleteAccountButton.
  ///
  /// In ko, this message translates to:
  /// **'삭제'**
  String get deleteAccountButton;

  /// No description provided for @accountDeleted.
  ///
  /// In ko, this message translates to:
  /// **'계정을 삭제했어요.'**
  String get accountDeleted;

  /// No description provided for @errSignIn.
  ///
  /// In ko, this message translates to:
  /// **'로그인하지 못했어요. 다시 시도해 주세요.'**
  String get errSignIn;

  /// No description provided for @privateVillage.
  ///
  /// In ko, this message translates to:
  /// **'비공개 마을'**
  String get privateVillage;

  /// No description provided for @members.
  ///
  /// In ko, this message translates to:
  /// **'멤버'**
  String get members;

  /// No description provided for @requestJoin.
  ///
  /// In ko, this message translates to:
  /// **'입주 신청'**
  String get requestJoin;

  /// No description provided for @joinPending.
  ///
  /// In ko, this message translates to:
  /// **'승인을 기다리고 있어요'**
  String get joinPending;

  /// No description provided for @approve.
  ///
  /// In ko, this message translates to:
  /// **'승인'**
  String get approve;

  /// No description provided for @decline.
  ///
  /// In ko, this message translates to:
  /// **'거절'**
  String get decline;

  /// No description provided for @removeMember.
  ///
  /// In ko, this message translates to:
  /// **'내보내기'**
  String get removeMember;

  /// No description provided for @noMembers.
  ///
  /// In ko, this message translates to:
  /// **'아직 없어요'**
  String get noMembers;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'de',
    'en',
    'es',
    'fr',
    'id',
    'ja',
    'ko',
    'pt',
    'ru',
    'zh',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'id':
      return AppLocalizationsId();
    case 'ja':
      return AppLocalizationsJa();
    case 'ko':
      return AppLocalizationsKo();
    case 'pt':
      return AppLocalizationsPt();
    case 'ru':
      return AppLocalizationsRu();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
