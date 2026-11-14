// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Un village d\'hiver\nà bâtir entre amis';

  @override
  String get createVillage => 'Créer un village';

  @override
  String get openByLink => 'Ouvrir un lien d\'invitation';

  @override
  String get myVillages => 'Mes villages';

  @override
  String get noVillages =>
      'Pas encore de village. Crées-en un ou ouvre le lien d\'invitation d\'un ami.';

  @override
  String get privacyPolicy => 'Politique de confidentialité';

  @override
  String get createHeading => 'Comment s\'appelle ton village ?';

  @override
  String get villageNameHint => 'ex. Village des Flocons';

  @override
  String get createCapacity => 'Jusqu\'à 6 amis emménagent gratuitement.';

  @override
  String get createButton => 'Créer le village';

  @override
  String get creating => 'Création…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'Places libres : $count';
  }

  @override
  String get villageComplete => 'Village complet';

  @override
  String get makeMyHouse => 'Bâtir ma maison';

  @override
  String get myHouse => 'Ma maison';

  @override
  String get invite => 'Inviter des amis';

  @override
  String get deleteVillage => 'Supprimer le village';

  @override
  String get deleteConfirmTitle => 'Supprimer ce village ?';

  @override
  String deleteConfirmBody(int count) {
    return 'Tout sera supprimé définitivement : maisons ($count), photos et messages.';
  }

  @override
  String get deleteButton => 'Supprimer le village et ses maisons';

  @override
  String get loadFailed => 'Impossible de charger le village';

  @override
  String get retry => 'Réessayer';

  @override
  String get notFoundTitle => 'Village introuvable';

  @override
  String get notFoundBody =>
      'Le lien est peut-être erroné ou le village a été supprimé.';

  @override
  String claimTitle(int slot) {
    return 'Construire sur le terrain $slot';
  }

  @override
  String get firstHouseIntro =>
      'Ton village est prêt ! On construit la première maison ?';

  @override
  String get nickname => 'Pseudo';

  @override
  String get nicknameHint => 'Un nom que tes amis reconnaîtront';

  @override
  String get houseStyle => 'Type de maison';

  @override
  String get photo => 'Photo';

  @override
  String get optional => '(facultatif)';

  @override
  String get choosePhoto => 'Choisir une photo';

  @override
  String get changePhoto => 'Changer la photo';

  @override
  String get addPhoto => 'Ajouter une photo';

  @override
  String get removePhoto => 'Retirer la photo';

  @override
  String get message => 'Message';

  @override
  String get messageHint => 'Un petit mot pour tes voisins';

  @override
  String get visibilityNote =>
      'Ton pseudo, ton message et ta photo sont visibles par toute personne ayant le lien du village.';

  @override
  String get submitHouse => 'Terminer ma maison';

  @override
  String get submitting => 'Construction…';

  @override
  String moveToSlot(int slot) {
    return 'Déménager sur le terrain libre $slot';
  }

  @override
  String frameTitle(String name) {
    return 'La petite maison de $name';
  }

  @override
  String get noMessage => 'Aucun message.';

  @override
  String joinedOn(String date) {
    return 'Ici depuis le $date';
  }

  @override
  String get report => 'Signaler un contenu inapproprié';

  @override
  String get reported => 'Signalement reçu. Nous allons l\'examiner.';

  @override
  String get removeMine => 'Vider ma maison';

  @override
  String get removeAsOwner => 'Vider cette maison (créateur)';

  @override
  String get removeConfirm =>
      'Vider cette maison ? Sa photo et son message seront supprimés.';

  @override
  String get cancel => 'Annuler';

  @override
  String get removeButton => 'Vider la maison';

  @override
  String get photoLoadFailed => 'Impossible de charger la photo.';

  @override
  String get inviteTitle => 'Inviter des amis';

  @override
  String inviteBody(int count) {
    return 'Maisons libres : $count.';
  }

  @override
  String get copyLink => 'Copier le lien';

  @override
  String get linkCopied => 'Lien d\'invitation copié.';

  @override
  String get shareLink => 'Partager';

  @override
  String get inviteNote => 'Ne le partage qu\'avec des gens de confiance.';

  @override
  String shareText(String url) {
    return 'Construis une maison dans notre village d\'hiver ! $url';
  }

  @override
  String litUp(String name) {
    return 'La maison de $name s\'est allumée !';
  }

  @override
  String get photoFailedAfterClaim =>
      'Ta maison est construite, mais la photo n\'a pas pu être envoyée. Touche ta maison pour réessayer.';

  @override
  String get alreadyHaveHouse => 'Tu as déjà une maison ici.';

  @override
  String houseRemoved(String name) {
    return 'La maison de $name a été vidée.';
  }

  @override
  String get openLinkTitle => 'Ouvrir un lien d\'invitation';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Ouvrir';

  @override
  String get linkInvalid => 'Vérifie le lien d\'invitation.';

  @override
  String get nameRequired => 'Saisis un nom de village.';

  @override
  String get nameTooLong => '20 caractères maximum.';

  @override
  String get nicknameRequired => 'Saisis un pseudo.';

  @override
  String get nicknameTooLong => '10 caractères maximum.';

  @override
  String get messageTooLong => '60 caractères maximum.';

  @override
  String get errRateLimited => 'Trop de demandes. Réessaie dans un instant.';

  @override
  String get errNetwork =>
      'Tu es hors ligne. Vérifie ta connexion et réessaie.';

  @override
  String get errForbidden => 'Tu n\'as pas l\'autorisation de faire cela.';

  @override
  String get errPhotoTooLarge => 'La photo est trop lourde.';

  @override
  String get errPhotoUnsupported => 'Format de photo non pris en charge.';

  @override
  String get errNotFound => 'Introuvable.';

  @override
  String get errServer => 'Un problème est survenu. Réessaie dans un instant.';

  @override
  String get errSlotTaken =>
      'Quelqu\'un vient de prendre ce terrain. Ton brouillon est conservé : choisis un autre terrain libre.';

  @override
  String get errVillageFull =>
      'Tous les terrains ouverts sont pris. Agrandis le village ou crées-en un nouveau.';

  @override
  String get errAlreadyJoined =>
      'Cet appareil a déjà une maison dans ce village.';

  @override
  String get errNoServer =>
      'Aucun serveur configuré (version de développement).';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'Encore $remaining ami(s) pour débloquer « $reward » 🎁';
  }

  @override
  String get decorAurora => 'Ciel d\'aurore boréale';

  @override
  String get growBig => 'Agrandir le village';

  @override
  String get useCredit => 'Utiliser un de tes pass';

  @override
  String get upgradeWaiting => 'Confirmation de l\'achat…';

  @override
  String get restorePurchases => 'Restaurer les achats';

  @override
  String get restored => 'Achats restaurés.';

  @override
  String get purchasesUnavailable => 'Achats bientôt disponibles';

  @override
  String get errNoCredit => 'Aucun pass disponible.';

  @override
  String get errAlreadyBig =>
      'Ce village est déjà à sa taille maximale (60 maisons).';

  @override
  String get errPurchaseFailed => 'L\'achat n\'a pas abouti. Réessaie.';

  @override
  String get errPurchasePending =>
      'Paiement effectué, mais la confirmation tarde. Rouvre dans un moment, ce sera appliqué automatiquement.';

  @override
  String get doorDirection => 'Orientation de la porte';

  @override
  String get dirFrontLeft => 'Avant gauche';

  @override
  String get dirFrontRight => 'Avant droite';

  @override
  String get dirBackRight => 'Arrière droite';

  @override
  String get dirBackLeft => 'Arrière gauche';

  @override
  String get dirTowardCentre => 'Vers le centre';

  @override
  String districtOpened(String name) {
    return '3 nouveaux terrains ouverts : $name !';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (pas encore ouverte) · ouvre-la en agrandissant le village';
  }

  @override
  String get pickDistrict => 'Quelle rue ouvrir ?';

  @override
  String get districtHalf => 'À moitié ouverte';

  @override
  String buyDistrict(String price) {
    return 'Agrandir pour $price';
  }

  @override
  String maxVillage(int max) {
    return 'Déjà le plus grand village ($max)';
  }

  @override
  String get editLook => '🎨 Décorer';

  @override
  String get editLookMenu => 'Décorer (chemins et décorations)';

  @override
  String get pathStyleTitle => 'Chemin';

  @override
  String get pathDirt => 'Terre';

  @override
  String get pathStones => 'Pas japonais';

  @override
  String get pathBrick => 'Briques';

  @override
  String get pathSnow => 'Neige';

  @override
  String get lookHint =>
      'Fais glisser l\'anneau sous une décoration pour la déplacer.';

  @override
  String get resetDecor => 'Réinitialiser les décorations';

  @override
  String get saveLook => 'Enregistrer';

  @override
  String get savingLook => 'Enregistrement…';

  @override
  String get lookSaved => 'Décoration du village enregistrée.';
}
