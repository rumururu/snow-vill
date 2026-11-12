// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Зимняя деревня,\nкоторую строишь с друзьями';

  @override
  String get taglineBody =>
      'Один друг — один дом. Открывай переулки вокруг соборной площади, и деревня вырастет до 60 домов. В каждом переулке — своя достопримечательность: каток, дом Санты и другие. Фото видно, только если нажать на дом.';

  @override
  String get createVillage => 'Создать деревню';

  @override
  String get openByLink => 'Открыть ссылку-приглашение';

  @override
  String get myVillages => 'Мои деревни';

  @override
  String get noVillages =>
      'Деревень пока нет. Создай свою или открой приглашение от друга.';

  @override
  String get privacyPolicy => 'Политика конфиденциальности';

  @override
  String get createHeading => 'Как назовём деревню?';

  @override
  String get villageNameHint => 'напр. Снежинкино';

  @override
  String get createCapacity =>
      'До 6 друзей заселятся бесплатно, а с новыми переулками деревня вырастет до 60 домов.';

  @override
  String get createButton => 'Создать деревню';

  @override
  String get creating => 'Создаём…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'Свободно мест: $count';
  }

  @override
  String get villageComplete => 'Деревня готова';

  @override
  String get tapHint =>
      'Нажми на дом, где горит свет, — откроется фоторамка, на пустой — можно заселиться.';

  @override
  String get makeMyHouse => 'Построить дом';

  @override
  String get myHouse => 'Мой дом';

  @override
  String get invite => 'Позвать друзей';

  @override
  String get deleteVillage => 'Удалить деревню';

  @override
  String get deleteConfirmTitle => 'Удалить эту деревню?';

  @override
  String deleteConfirmBody(int count) {
    return 'Все дома ($count), фото и сообщения будут удалены навсегда.';
  }

  @override
  String get deleteButton => 'Удалить деревню и все дома';

  @override
  String get loadFailed => 'Не удалось загрузить деревню';

  @override
  String get retry => 'Повторить';

  @override
  String get notFoundTitle => 'Деревня не найдена';

  @override
  String get notFoundBody => 'Возможно, ссылка неверна или деревня удалена.';

  @override
  String claimTitle(int slot) {
    return 'Строим на участке $slot';
  }

  @override
  String get firstHouseIntro => 'Деревня готова! Построим первый дом?';

  @override
  String get nickname => 'Никнейм';

  @override
  String get nicknameHint => 'Имя, по которому тебя узнают друзья';

  @override
  String get houseStyle => 'Тип дома';

  @override
  String get styleWood => 'Дерево';

  @override
  String get styleSage => 'Шалфей';

  @override
  String get styleIndigo => 'Индиго';

  @override
  String get photo => 'Фото';

  @override
  String get optional => '(необязательно)';

  @override
  String get choosePhoto => 'Выбрать фото';

  @override
  String get changePhoto => 'Сменить фото';

  @override
  String get addPhoto => 'Добавить фото';

  @override
  String get removePhoto => 'Убрать фото';

  @override
  String get photoHint =>
      'Фото не обязательно. Оно обрезается до квадрата, а данные о местоположении (EXIF) удаляются.';

  @override
  String get message => 'Сообщение';

  @override
  String get messageHint => 'Пара слов соседям по деревне';

  @override
  String get visibilityNote =>
      'Твой никнейм, сообщение и фото видны всем, у кого есть ссылка на эту деревню.';

  @override
  String get submitHouse => 'Достроить дом';

  @override
  String get submitting => 'Строим…';

  @override
  String moveToSlot(int slot) {
    return 'Переехать на свободный участок $slot';
  }

  @override
  String frameTitle(String name) {
    return 'Домик: $name';
  }

  @override
  String get noMessage => 'Сообщения нет.';

  @override
  String joinedOn(String date) {
    return 'Заселение: $date';
  }

  @override
  String get report => 'Пожаловаться на контент';

  @override
  String get reported => 'Жалоба получена. Мы её проверим.';

  @override
  String get removeMine => 'Освободить мой дом';

  @override
  String get removeAsOwner => 'Освободить дом (владелец)';

  @override
  String get removeConfirm =>
      'Освободить этот дом? Фото и сообщение будут удалены.';

  @override
  String get cancel => 'Отмена';

  @override
  String get removeButton => 'Освободить дом';

  @override
  String get photoLoadFailed => 'Не удалось загрузить фото.';

  @override
  String get inviteTitle => 'Позвать друзей';

  @override
  String inviteBody(int count) {
    return 'Позови друзей, чтобы заполнить деревню. Свободно домов: $count.';
  }

  @override
  String get copyLink => 'Копировать ссылку';

  @override
  String get linkCopied => 'Ссылка-приглашение скопирована.';

  @override
  String get shareLink => 'Поделиться';

  @override
  String get inviteNote =>
      'Любой, у кого есть ссылка, может посмотреть деревню и заселиться в пустой дом. Отправляй её только тем, кому доверяешь.';

  @override
  String shareText(String url) {
    return 'Построй дом в нашей зимней деревне! $url';
  }

  @override
  String litUp(String name) {
    return '$name: в доме зажёгся свет!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Дом построен, но фото не загрузилось. Нажми на свой дом, чтобы попробовать ещё раз.';

  @override
  String get alreadyHaveHouse =>
      'У тебя уже есть дом в этой деревне. Позови друзей, чтобы заполнить остальные!';

  @override
  String houseRemoved(String name) {
    return '$name: дом освобождён.';
  }

  @override
  String get openLinkTitle => 'Открыть ссылку-приглашение';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Открыть';

  @override
  String get linkInvalid => 'Проверь ссылку-приглашение.';

  @override
  String get nameRequired => 'Введи название деревни.';

  @override
  String get nameTooLong => 'Не более 20 символов.';

  @override
  String get nicknameRequired => 'Введи никнейм.';

  @override
  String get nicknameTooLong => 'Не более 10 символов.';

  @override
  String get messageTooLong => 'Не более 60 символов.';

  @override
  String get errRateLimited => 'Слишком много запросов. Попробуй чуть позже.';

  @override
  String get errNetwork => 'Нет соединения. Проверь сеть и попробуй снова.';

  @override
  String get errForbidden => 'У тебя нет прав на это действие.';

  @override
  String get errPhotoTooLarge => 'Фото слишком большое.';

  @override
  String get errPhotoUnsupported => 'Формат фото не поддерживается.';

  @override
  String get errNotFound => 'Не найдено.';

  @override
  String get errServer => 'Что-то пошло не так. Попробуй чуть позже.';

  @override
  String get errSlotTaken =>
      'Этот участок только что заняли. Черновик сохранён — выбери другой свободный участок.';

  @override
  String get errVillageFull =>
      'Все открытые участки заняты. Расширь деревню или создай новую.';

  @override
  String get errAlreadyJoined =>
      'С этого устройства уже построен дом в этой деревне.';

  @override
  String get errNoServer => 'Сервер не настроен (сборка для разработки).';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'До награды «$reward» осталось друзей: $remaining 🎁';
  }

  @override
  String get decorSled => 'Сани с подарками';

  @override
  String get decorSnowFamily => 'Семья снеговиков';

  @override
  String get decorAurora => 'Северное сияние';

  @override
  String get growBig => 'Расширить деревню';

  @override
  String upgradePointLots(int count) {
    return 'Откроются закрытые участки: $count.';
  }

  @override
  String upgradePointAurora(int big) {
    return 'Когда заселят все дома ($big), в небе загорится северное сияние.';
  }

  @override
  String get upgradePointGift =>
      'Расширить деревню может кто угодно, не только владелец; изменения видят все — на сайте и в приложении.';

  @override
  String get useCredit => 'Использовать свой пропуск';

  @override
  String get upgradeWaiting => 'Подтверждаем покупку…';

  @override
  String get restorePurchases => 'Восстановить покупки';

  @override
  String get restored => 'Покупки восстановлены.';

  @override
  String get purchasesUnavailable => 'Покупки скоро появятся';

  @override
  String get errNoCredit => 'Нет доступных пропусков.';

  @override
  String get errAlreadyBig => 'Деревня уже максимального размера (60 домов).';

  @override
  String get errPurchaseFailed => 'Покупка не завершена. Попробуй ещё раз.';

  @override
  String get errPurchasePending =>
      'Оплата прошла, но подтверждение задерживается. Открой чуть позже — всё применится.';

  @override
  String get tapHintFull => 'Нажми на дом, чтобы открыть фоторамку друга.';

  @override
  String get doorDirection => 'Направление двери';

  @override
  String get dirFrontLeft => 'Спереди слева';

  @override
  String get dirFrontRight => 'Спереди справа';

  @override
  String get dirBackRight => 'Сзади справа';

  @override
  String get dirBackLeft => 'Сзади слева';

  @override
  String get dirTowardCentre => 'К центру';

  @override
  String districtOpened(String name) {
    return '$name: открыто 3 новых участка!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (ещё закрыт) · открой, расширив деревню';
  }

  @override
  String expandBody(int capacity, int step) {
    return 'Сейчас в деревне домов: $capacity. Выбери переулок, чтобы открыть ещё участков: $step (в переулке 6 участков, открываются в два этапа).';
  }

  @override
  String get pickDistrict => 'Какой переулок открыть';

  @override
  String get districtNew => 'Новый переулок · 3 участка';

  @override
  String get districtHalf => 'Открыт наполовину · последние 3';

  @override
  String buyDistrict(String price) {
    return 'Расширить за $price';
  }

  @override
  String priceLadder(String p1, String p2, String p3, String p4, int max) {
    return '6 бесплатно → 9 за $p1 → 12 за $p2 → 15 за $p3 → далее $p4 за каждые 3 (до $max)';
  }

  @override
  String maxVillage(int max) {
    return 'Это уже самая большая деревня ($max)';
  }

  @override
  String get editLook => '🎨 Украсить';

  @override
  String get editLookMenu => 'Украсить (дорожки и декор)';

  @override
  String get pathStyleTitle => 'Дорожка';

  @override
  String get pathDirt => 'Грунт';

  @override
  String get pathStones => 'Камни';

  @override
  String get pathBrick => 'Кирпич';

  @override
  String get pathSnow => 'Снег';

  @override
  String get lookHint =>
      'Перетащи кольцо под украшением, чтобы его сдвинуть. Нельзя ставить на дома, дорожки, достопримечательности и за пределы деревни.';

  @override
  String get resetDecor => 'Сбросить украшения';

  @override
  String get saveLook => 'Сохранить';

  @override
  String get savingLook => 'Сохраняем…';

  @override
  String get lookSaved => 'Оформление деревни сохранено.';
}
