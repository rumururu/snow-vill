// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'A winter village\nyou build with friends';

  @override
  String get taglineBody =>
      'One friend, one house. More friends unlock a sled and a snowman family; a full big village brings the aurora. Photos only appear when a house is tapped.';

  @override
  String get createVillage => 'Create a village';

  @override
  String get openByLink => 'Open an invite link';

  @override
  String get myVillages => 'My villages';

  @override
  String get noVillages =>
      'No villages yet. Create one or open an invite link from a friend.';

  @override
  String get privacyPolicy => 'Privacy policy';

  @override
  String get createHeading => 'Name your village';

  @override
  String get villageNameHint => 'e.g. Snowflake Village';

  @override
  String get createCapacity => 'Up to 8 friends can each move into a house.';

  @override
  String get createButton => 'Create village';

  @override
  String get creating => 'Creating…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return '$count more can move in';
  }

  @override
  String get villageComplete => 'Village complete';

  @override
  String get tapHint =>
      'Tap a lit house for its photo frame, an empty one to move in.';

  @override
  String get makeMyHouse => 'Build my house';

  @override
  String get myHouse => 'My house';

  @override
  String get invite => 'Invite friends';

  @override
  String get deleteVillage => 'Delete village';

  @override
  String get deleteConfirmTitle => 'Delete this village?';

  @override
  String deleteConfirmBody(int count) {
    return 'All $count houses, photos and messages will be deleted permanently.';
  }

  @override
  String get deleteButton => 'Delete village and all houses';

  @override
  String get loadFailed => 'Couldn\'t load the village';

  @override
  String get retry => 'Try again';

  @override
  String get notFoundTitle => 'Village not found';

  @override
  String get notFoundBody =>
      'The link may be wrong or the village was deleted.';

  @override
  String claimTitle(int slot) {
    return 'Build on lot $slot';
  }

  @override
  String get firstHouseIntro => 'Your village is ready! Build the first house?';

  @override
  String get nickname => 'Nickname';

  @override
  String get nicknameHint => 'A name friends will recognise';

  @override
  String get houseStyle => 'House style';

  @override
  String get styleWood => 'Wood';

  @override
  String get styleSage => 'Sage';

  @override
  String get styleIndigo => 'Indigo';

  @override
  String get photo => 'Photo';

  @override
  String get optional => '(optional)';

  @override
  String get choosePhoto => 'Choose photo';

  @override
  String get changePhoto => 'Change photo';

  @override
  String get addPhoto => 'Add photo';

  @override
  String get removePhoto => 'Remove photo';

  @override
  String get photoHint =>
      'Photo is optional. It is cropped square and location data (EXIF) is removed.';

  @override
  String get message => 'Message';

  @override
  String get messageHint => 'A note for your village friends';

  @override
  String get visibilityNote =>
      'Your nickname, message and photo are visible to anyone with this village link.';

  @override
  String get submitHouse => 'Finish my house';

  @override
  String get submitting => 'Building…';

  @override
  String moveToSlot(int slot) {
    return 'Move to empty lot $slot';
  }

  @override
  String frameTitle(String name) {
    return '$name\'s little house';
  }

  @override
  String get noMessage => 'No message.';

  @override
  String joinedOn(String date) {
    return 'Moved in $date';
  }

  @override
  String get report => 'Report inappropriate content';

  @override
  String get reported => 'Report received. We\'ll review it.';

  @override
  String get removeMine => 'Empty my house';

  @override
  String get removeAsOwner => 'Remove this house (owner)';

  @override
  String get removeConfirm =>
      'Empty this house? Its photo and message will be deleted.';

  @override
  String get cancel => 'Cancel';

  @override
  String get removeButton => 'Empty house';

  @override
  String get photoLoadFailed => 'Couldn\'t load the photo.';

  @override
  String get inviteTitle => 'Invite friends';

  @override
  String inviteBody(int count) {
    return 'Invite friends to finish the village. $count houses left.';
  }

  @override
  String get copyLink => 'Copy link';

  @override
  String get linkCopied => 'Invite link copied.';

  @override
  String get shareLink => 'Share';

  @override
  String get inviteNote =>
      'Anyone with the link can view the village and move into an empty house. Share it only with people you trust.';

  @override
  String shareText(String url) {
    return 'Build a house in our winter village! $url';
  }

  @override
  String litUp(String name) {
    return '$name\'s house lit up!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Your house is built but the photo failed. Tap your house to try again.';

  @override
  String get alreadyHaveHouse =>
      'You already have a house here. Invite friends to fill the rest!';

  @override
  String houseRemoved(String name) {
    return '$name\'s house was emptied.';
  }

  @override
  String get openLinkTitle => 'Open an invite link';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Open';

  @override
  String get linkInvalid => 'Please check the invite link.';

  @override
  String get nameRequired => 'Enter a village name.';

  @override
  String get nameTooLong => 'Use 20 characters or fewer.';

  @override
  String get nicknameRequired => 'Enter a nickname.';

  @override
  String get nicknameTooLong => 'Use 10 characters or fewer.';

  @override
  String get messageTooLong => 'Use 60 characters or fewer.';

  @override
  String get errRateLimited => 'Too many requests. Try again shortly.';

  @override
  String get errNetwork => 'You\'re offline. Check your connection and retry.';

  @override
  String get errForbidden => 'You don\'t have permission to do that.';

  @override
  String get errPhotoTooLarge => 'The photo is too large.';

  @override
  String get errPhotoUnsupported => 'Unsupported photo format.';

  @override
  String get errNotFound => 'Not found.';

  @override
  String get errServer => 'Something went wrong. Try again shortly.';

  @override
  String get errSlotTaken =>
      'Someone just took this lot. Your draft is kept — pick another empty lot.';

  @override
  String get errVillageFull => 'All 8 houses are taken.';

  @override
  String get errAlreadyJoined =>
      'This device already has a house in this village.';

  @override
  String get errNoServer => 'No server configured (dev build).';

  @override
  String milestoneHint(int remaining, String reward) {
    return '$remaining more friends to unlock “$reward” 🎁';
  }

  @override
  String get decorSled => 'Gift sled';

  @override
  String get decorSnowFamily => 'Snowman family';

  @override
  String get decorAurora => 'Aurora sky';

  @override
  String lockedLot(int slot) {
    return 'Lot $slot (locked) · grow into a big village to move in';
  }

  @override
  String get growBig => 'Grow into a big village';

  @override
  String upgradeBody(int free, int big) {
    return 'Free villages hold $free houses. A big village holds $big.';
  }

  @override
  String upgradePointLots(int count) {
    return '$count locked lots open up.';
  }

  @override
  String upgradePointAurora(int big) {
    return 'When all $big houses are filled, an aurora lights up the sky.';
  }

  @override
  String get upgradePointGift =>
      'Anyone can gift it, not just the owner. It applies for everyone on web and app.';

  @override
  String buyUpgrade(String price) {
    return 'Make it big for $price';
  }

  @override
  String get useCredit => 'Use your purchased upgrade';

  @override
  String get upgradeWaiting => 'Confirming your purchase…';

  @override
  String upgradeDone(int count) {
    return 'It\'s a big village now! $count lots opened.';
  }

  @override
  String get restorePurchases => 'Restore purchases';

  @override
  String get restored => 'Purchases restored.';

  @override
  String get purchasesUnavailable => 'Purchases coming soon';

  @override
  String get errNoCredit => 'No upgrade available to use.';

  @override
  String get errAlreadyBig => 'Already a big village.';

  @override
  String get errPurchaseFailed =>
      'The purchase didn\'t complete. Please try again.';

  @override
  String get errPurchasePending =>
      'Paid, but confirmation is delayed. Reopen shortly and it will be applied.';

  @override
  String get tapHintFull => 'Tap a house to open your friends\' photo frames.';
}
