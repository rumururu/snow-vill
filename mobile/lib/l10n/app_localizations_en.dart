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
  String get createCapacity => 'Up to 6 friends move in for free.';

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
  String get houseStyle => 'House type';

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
    return '$count houses left.';
  }

  @override
  String get copyLink => 'Copy link';

  @override
  String get linkCopied => 'Invite link copied.';

  @override
  String get shareLink => 'Share';

  @override
  String get inviteNote => 'Share it only with people you trust.';

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
  String get alreadyHaveHouse => 'You already have a house here.';

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
  String get errVillageFull =>
      'Every open lot is taken. Grow the village or start a new one.';

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
  String get decorAurora => 'Aurora sky';

  @override
  String get growBig => 'Grow the village';

  @override
  String get useCredit => 'Use a pass you own';

  @override
  String get upgradeWaiting => 'Confirming your purchase…';

  @override
  String get restorePurchases => 'Restore purchases';

  @override
  String get restored => 'Purchases restored.';

  @override
  String get purchasesUnavailable => 'Purchases coming soon';

  @override
  String get errNoCredit => 'No upgrade available to use.';

  @override
  String get errAlreadyBig =>
      'This village is already at its largest (60 houses).';

  @override
  String get errPurchaseFailed =>
      'The purchase didn\'t complete. Please try again.';

  @override
  String get errPurchasePending =>
      'Paid, but confirmation is delayed. Reopen shortly and it will be applied.';

  @override
  String get doorDirection => 'Door direction';

  @override
  String get dirFrontLeft => 'Front left';

  @override
  String get dirFrontRight => 'Front right';

  @override
  String get dirBackRight => 'Back right';

  @override
  String get dirBackLeft => 'Back left';

  @override
  String get dirTowardCentre => 'Toward the centre';

  @override
  String districtOpened(String name) {
    return '3 new lots opened in $name!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (not open yet) · open it by growing the village';
  }

  @override
  String get pickDistrict => 'Which district should open?';

  @override
  String get districtHalf => 'Half open';

  @override
  String buyDistrict(String price) {
    return 'Grow for $price';
  }

  @override
  String maxVillage(int max) {
    return 'Already the largest village ($max)';
  }

  @override
  String get editLook => '🎨 Decorate';

  @override
  String get editLookMenu => 'Decorate (paths & decorations)';

  @override
  String get pathStyleTitle => 'Path';

  @override
  String get pathDirt => 'Dirt';

  @override
  String get pathStones => 'Stones';

  @override
  String get pathBrick => 'Brick';

  @override
  String get pathSnow => 'Snow';

  @override
  String get lookHint => 'Drag the ring under a decoration to move it.';

  @override
  String get resetDecor => 'Reset decorations';

  @override
  String get saveLook => 'Save';

  @override
  String get savingLook => 'Saving…';

  @override
  String get lookSaved => 'Saved the village look.';

  @override
  String get signIn => 'Sign in';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get continueWithApple => 'Continue with Apple';

  @override
  String get signOut => 'Sign out';

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get deleteAccountTitle => 'Delete your account?';

  @override
  String get deleteAccountBody =>
      'Your villages, houses and photos will all be deleted. This can\'t be undone.';

  @override
  String get deleteAccountButton => 'Delete';

  @override
  String get accountDeleted => 'Your account was deleted.';

  @override
  String get errSignIn => 'Couldn\'t sign in. Please try again.';

  @override
  String get privateVillage => 'Private village';

  @override
  String get members => 'Members';

  @override
  String get requestJoin => 'Request to join';

  @override
  String get joinPending => 'Waiting for approval';

  @override
  String get approve => 'Approve';

  @override
  String get decline => 'Decline';

  @override
  String get removeMember => 'Remove';

  @override
  String get noMembers => 'No one yet';
}
