import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ko.dart';

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
    Locale('en'),
    Locale('ko'),
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

  /// No description provided for @taglineBody.
  ///
  /// In ko, this message translates to:
  /// **'친구 한 명이 집 한 채. 8채에 불이 켜지면 마을이 완성돼요. 사진은 집을 눌렀을 때만 보여요.'**
  String get taglineBody;

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
  /// **'최대 8명의 친구가 한 집씩 입주할 수 있어요.'**
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
  /// **'{count}/8'**
  String occupancy(int count);

  /// No description provided for @freeHouses.
  ///
  /// In ko, this message translates to:
  /// **'빈 집 {count}채'**
  String freeHouses(int count);

  /// No description provided for @villageComplete.
  ///
  /// In ko, this message translates to:
  /// **'마을이 완성됐어요'**
  String get villageComplete;

  /// No description provided for @tapHint.
  ///
  /// In ko, this message translates to:
  /// **'불 켜진 집을 누르면 사진 액자가, 빈 집을 누르면 내 집 만들기가 열려요.'**
  String get tapHint;

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
  /// **'집 스타일'**
  String get houseStyle;

  /// No description provided for @styleWood.
  ///
  /// In ko, this message translates to:
  /// **'나무'**
  String get styleWood;

  /// No description provided for @styleSage.
  ///
  /// In ko, this message translates to:
  /// **'세이지'**
  String get styleSage;

  /// No description provided for @styleIndigo.
  ///
  /// In ko, this message translates to:
  /// **'인디고'**
  String get styleIndigo;

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

  /// No description provided for @photoHint.
  ///
  /// In ko, this message translates to:
  /// **'사진 없이도 참여할 수 있어요. 정사각형으로 잘리고 위치 정보(EXIF)는 지워져요.'**
  String get photoHint;

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
  /// **'친구를 초대해 마을을 완성해요. 빈 집이 {count}채 남았어요.'**
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
  /// **'링크를 받은 사람은 누구나 마을을 구경하고 빈 집에 입주할 수 있어요. 믿을 수 있는 친구에게만 보내 주세요.'**
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
  /// **'이미 이 마을에 내 집이 있어요. 친구를 초대해 빈 집을 채워 주세요!'**
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
  /// **'마을의 8채가 모두 찼어요.'**
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
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ko'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ko':
      return AppLocalizationsKo();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
