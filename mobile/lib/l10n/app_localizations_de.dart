// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Ein Winterdorf,\ndas du mit Freunden baust';

  @override
  String get taglineBody =>
      'Ein Freund, ein Haus. Öffne Gassen rund um den Domplatz und vergrößere das Dorf auf bis zu 60 Häuser – jede Gasse bringt etwas Neues wie eine Eisbahn oder das Haus des Weihnachtsmanns. Fotos erscheinen nur, wenn man auf ein Haus tippt.';

  @override
  String get createVillage => 'Dorf gründen';

  @override
  String get openByLink => 'Einladungslink öffnen';

  @override
  String get myVillages => 'Meine Dörfer';

  @override
  String get noVillages =>
      'Noch keine Dörfer. Gründe eins oder öffne den Einladungslink eines Freundes.';

  @override
  String get privacyPolicy => 'Datenschutzerklärung';

  @override
  String get createHeading => 'Wie soll dein Dorf heißen?';

  @override
  String get villageNameHint => 'z. B. Schneeflockendorf';

  @override
  String get createCapacity =>
      'Bis zu 6 Freunde ziehen kostenlos ein; öffne weitere Gassen für bis zu 60 Häuser.';

  @override
  String get createButton => 'Dorf gründen';

  @override
  String get creating => 'Wird erstellt…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'Noch $count frei';
  }

  @override
  String get villageComplete => 'Dorf komplett';

  @override
  String get tapHint =>
      'Tippe auf ein beleuchtetes Haus für den Fotorahmen, auf ein leeres zum Einziehen.';

  @override
  String get makeMyHouse => 'Mein Haus bauen';

  @override
  String get myHouse => 'Mein Haus';

  @override
  String get invite => 'Freunde einladen';

  @override
  String get deleteVillage => 'Dorf löschen';

  @override
  String get deleteConfirmTitle => 'Dieses Dorf löschen?';

  @override
  String deleteConfirmBody(int count) {
    return 'Alle Häuser ($count), Fotos und Nachrichten werden endgültig gelöscht.';
  }

  @override
  String get deleteButton => 'Dorf und alle Häuser löschen';

  @override
  String get loadFailed => 'Dorf konnte nicht geladen werden';

  @override
  String get retry => 'Erneut versuchen';

  @override
  String get notFoundTitle => 'Dorf nicht gefunden';

  @override
  String get notFoundBody =>
      'Der Link ist evtl. falsch oder das Dorf wurde gelöscht.';

  @override
  String claimTitle(int slot) {
    return 'Auf Grundstück $slot bauen';
  }

  @override
  String get firstHouseIntro =>
      'Dein Dorf ist bereit! Baust du das erste Haus?';

  @override
  String get nickname => 'Spitzname';

  @override
  String get nicknameHint => 'Ein Name, den deine Freunde erkennen';

  @override
  String get houseStyle => 'Hausart';

  @override
  String get styleWood => 'Holz';

  @override
  String get styleSage => 'Salbei';

  @override
  String get styleIndigo => 'Indigo';

  @override
  String get photo => 'Foto';

  @override
  String get optional => '(optional)';

  @override
  String get choosePhoto => 'Foto wählen';

  @override
  String get changePhoto => 'Foto ändern';

  @override
  String get addPhoto => 'Foto hinzufügen';

  @override
  String get removePhoto => 'Foto entfernen';

  @override
  String get photoHint =>
      'Ein Foto ist optional. Es wird quadratisch zugeschnitten und Standortdaten (EXIF) werden entfernt.';

  @override
  String get message => 'Nachricht';

  @override
  String get messageHint => 'Ein Gruß an deine Nachbarn';

  @override
  String get visibilityNote =>
      'Spitzname, Nachricht und Foto sieht jeder, der den Link zu diesem Dorf hat.';

  @override
  String get submitHouse => 'Mein Haus fertigstellen';

  @override
  String get submitting => 'Wird gebaut…';

  @override
  String moveToSlot(int slot) {
    return 'Auf freies Grundstück $slot umziehen';
  }

  @override
  String frameTitle(String name) {
    return 'Das kleine Haus von $name';
  }

  @override
  String get noMessage => 'Keine Nachricht.';

  @override
  String joinedOn(String date) {
    return 'Eingezogen am $date';
  }

  @override
  String get report => 'Unangemessenen Inhalt melden';

  @override
  String get reported => 'Meldung erhalten. Wir prüfen sie.';

  @override
  String get removeMine => 'Mein Haus räumen';

  @override
  String get removeAsOwner => 'Haus als Dorfgründer räumen';

  @override
  String get removeConfirm =>
      'Dieses Haus räumen? Foto und Nachricht werden gelöscht.';

  @override
  String get cancel => 'Abbrechen';

  @override
  String get removeButton => 'Haus räumen';

  @override
  String get photoLoadFailed => 'Foto konnte nicht geladen werden.';

  @override
  String get inviteTitle => 'Freunde einladen';

  @override
  String inviteBody(int count) {
    return 'Lade Freunde ein, um das Dorf zu füllen. Freie Häuser: $count.';
  }

  @override
  String get copyLink => 'Link kopieren';

  @override
  String get linkCopied => 'Einladungslink kopiert.';

  @override
  String get shareLink => 'Teilen';

  @override
  String get inviteNote =>
      'Jeder mit dem Link kann das Dorf ansehen und in ein leeres Haus einziehen. Teile ihn nur mit Leuten, denen du vertraust.';

  @override
  String shareText(String url) {
    return 'Bau ein Haus in unserem Winterdorf! $url';
  }

  @override
  String litUp(String name) {
    return 'Bei $name brennt jetzt Licht!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Dein Haus steht, aber das Foto konnte nicht hochgeladen werden. Tippe auf dein Haus, um es erneut zu versuchen.';

  @override
  String get alreadyHaveHouse =>
      'Du hast hier schon ein Haus. Lade Freunde ein, um den Rest zu füllen!';

  @override
  String houseRemoved(String name) {
    return 'Das Haus von $name wurde geräumt.';
  }

  @override
  String get openLinkTitle => 'Einladungslink öffnen';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Öffnen';

  @override
  String get linkInvalid => 'Bitte prüfe den Einladungslink.';

  @override
  String get nameRequired => 'Gib einen Dorfnamen ein.';

  @override
  String get nameTooLong => 'Höchstens 20 Zeichen.';

  @override
  String get nicknameRequired => 'Gib einen Spitznamen ein.';

  @override
  String get nicknameTooLong => 'Höchstens 10 Zeichen.';

  @override
  String get messageTooLong => 'Höchstens 60 Zeichen.';

  @override
  String get errRateLimited =>
      'Zu viele Anfragen. Versuch es gleich noch einmal.';

  @override
  String get errNetwork =>
      'Du bist offline. Prüfe deine Verbindung und versuch es erneut.';

  @override
  String get errForbidden => 'Dazu fehlt dir die Berechtigung.';

  @override
  String get errPhotoTooLarge => 'Das Foto ist zu groß.';

  @override
  String get errPhotoUnsupported => 'Fotoformat wird nicht unterstützt.';

  @override
  String get errNotFound => 'Nicht gefunden.';

  @override
  String get errServer =>
      'Etwas ist schiefgelaufen. Versuch es gleich noch einmal.';

  @override
  String get errSlotTaken =>
      'Jemand hat sich dieses Grundstück gerade geschnappt. Dein Entwurf bleibt erhalten – wähle ein anderes freies Grundstück.';

  @override
  String get errVillageFull =>
      'Alle offenen Grundstücke sind belegt. Vergrößere das Dorf oder gründe ein neues.';

  @override
  String get errAlreadyJoined =>
      'Dieses Gerät hat in diesem Dorf schon ein Haus.';

  @override
  String get errNoServer => 'Kein Server konfiguriert (Entwickler-Build).';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'Fehlende Freunde bis „$reward“: $remaining 🎁';
  }

  @override
  String get decorSled => 'Geschenkschlitten';

  @override
  String get decorSnowFamily => 'Schneemannfamilie';

  @override
  String get decorAurora => 'Polarlichthimmel';

  @override
  String get growBig => 'Dorf vergrößern';

  @override
  String upgradePointLots(int count) {
    return '$count gesperrte Grundstücke werden frei.';
  }

  @override
  String upgradePointAurora(int big) {
    return 'Sind alle $big Häuser bewohnt, leuchtet ein Polarlicht am Himmel.';
  }

  @override
  String get upgradePointGift =>
      'Jeder kann ein Dorf vergrößern, nicht nur der Gründer – und es gilt für alle, im Web und in der App.';

  @override
  String get useCredit => 'Vorhandenen Pass nutzen';

  @override
  String get upgradeWaiting => 'Kauf wird bestätigt…';

  @override
  String get restorePurchases => 'Käufe wiederherstellen';

  @override
  String get restored => 'Käufe wiederhergestellt.';

  @override
  String get purchasesUnavailable => 'Käufe bald verfügbar';

  @override
  String get errNoCredit => 'Kein Pass verfügbar.';

  @override
  String get errAlreadyBig =>
      'Dieses Dorf hat bereits die maximale Größe (60 Häuser).';

  @override
  String get errPurchaseFailed =>
      'Der Kauf wurde nicht abgeschlossen. Bitte versuch es erneut.';

  @override
  String get errPurchasePending =>
      'Bezahlt, aber die Bestätigung dauert noch. Schau gleich noch einmal rein, dann wird der Kauf automatisch übernommen.';

  @override
  String get tapHintFull =>
      'Tippe auf ein Haus, um die Fotorahmen deiner Freunde zu öffnen.';

  @override
  String get doorDirection => 'Türrichtung';

  @override
  String get dirFrontLeft => 'Vorne links';

  @override
  String get dirFrontRight => 'Vorne rechts';

  @override
  String get dirBackRight => 'Hinten rechts';

  @override
  String get dirBackLeft => 'Hinten links';

  @override
  String get dirTowardCentre => 'Zur Mitte';

  @override
  String districtOpened(String name) {
    return '3 neue Grundstücke in der $name geöffnet!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (noch geschlossen) · durch Vergrößern öffnen';
  }

  @override
  String expandBody(int capacity, int step) {
    return 'Dieses Dorf hat $capacity Häuser. Wähle eine Gasse, um $step weitere Grundstücke zu öffnen (eine Gasse hat 6 und öffnet sich in zwei Schritten).';
  }

  @override
  String get pickDistrict => 'Gasse wählen';

  @override
  String get districtNew => 'Neue Gasse · 3 Grundstücke';

  @override
  String get districtHalf => 'Halb offen · letzte 3';

  @override
  String buyDistrict(String price) {
    return 'Für $price vergrößern';
  }

  @override
  String priceLadder(String p1, String p2, String p3, String p4, int max) {
    return '6 gratis → 9 für $p1 → 12 für $p2 → 15 für $p3 → dann $p4 pro 3 (bis $max)';
  }

  @override
  String maxVillage(int max) {
    return 'Bereits das größte Dorf ($max)';
  }

  @override
  String get editLook => '🎨 Gestalten';

  @override
  String get editLookMenu => 'Dorf gestalten (Wege & Deko)';

  @override
  String get pathStyleTitle => 'Weg';

  @override
  String get pathDirt => 'Erde';

  @override
  String get pathStones => 'Trittsteine';

  @override
  String get pathBrick => 'Backstein';

  @override
  String get pathSnow => 'Schnee';

  @override
  String get lookHint =>
      'Zieh am Kreis unter einer Deko, um sie zu verschieben. Nicht auf Häuser, Wege oder Wahrzeichen und nicht außerhalb des Dorfes.';

  @override
  String get resetDecor => 'Deko zurücksetzen';

  @override
  String get saveLook => 'Speichern';

  @override
  String get savingLook => 'Wird gespeichert…';

  @override
  String get lookSaved => 'Dorfgestaltung gespeichert.';
}
