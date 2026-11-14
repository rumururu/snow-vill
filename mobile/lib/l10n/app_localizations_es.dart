// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Un pueblo de invierno\nque construyes con amigos';

  @override
  String get createVillage => 'Crear un pueblo';

  @override
  String get openByLink => 'Abrir un enlace de invitación';

  @override
  String get myVillages => 'Mis pueblos';

  @override
  String get noVillages =>
      'Aún no tienes pueblos. Crea uno o abre el enlace de invitación de un amigo.';

  @override
  String get privacyPolicy => 'Política de privacidad';

  @override
  String get createHeading => 'Ponle nombre a tu pueblo';

  @override
  String get villageNameHint => 'p. ej. Pueblo Copo de Nieve';

  @override
  String get createCapacity => 'Hasta 6 amigos se mudan gratis.';

  @override
  String get createButton => 'Crear pueblo';

  @override
  String get creating => 'Creando…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'Aún caben $count más';
  }

  @override
  String get villageComplete => '¡Pueblo completo!';

  @override
  String get makeMyHouse => 'Construir mi casa';

  @override
  String get myHouse => 'Mi casa';

  @override
  String get invite => 'Invitar amigos';

  @override
  String get deleteVillage => 'Eliminar pueblo';

  @override
  String get deleteConfirmTitle => '¿Eliminar este pueblo?';

  @override
  String deleteConfirmBody(int count) {
    return 'Se borrarán para siempre las casas ($count), las fotos y los mensajes.';
  }

  @override
  String get deleteButton => 'Eliminar pueblo y todas las casas';

  @override
  String get loadFailed => 'No se pudo cargar el pueblo';

  @override
  String get retry => 'Reintentar';

  @override
  String get notFoundTitle => 'Pueblo no encontrado';

  @override
  String get notFoundBody =>
      'Puede que el enlace esté mal o que el pueblo se haya eliminado.';

  @override
  String claimTitle(int slot) {
    return 'Construir en el lote $slot';
  }

  @override
  String get firstHouseIntro =>
      '¡Tu pueblo está listo! ¿Construyes la primera casa?';

  @override
  String get nickname => 'Apodo';

  @override
  String get nicknameHint => 'Un nombre que tus amigos reconozcan';

  @override
  String get houseStyle => 'Tipo de casa';

  @override
  String get styleWood => 'Madera';

  @override
  String get styleSage => 'Salvia';

  @override
  String get styleIndigo => 'Índigo';

  @override
  String get photo => 'Foto';

  @override
  String get optional => '(opcional)';

  @override
  String get choosePhoto => 'Elegir foto';

  @override
  String get changePhoto => 'Cambiar foto';

  @override
  String get addPhoto => 'Añadir foto';

  @override
  String get removePhoto => 'Quitar foto';

  @override
  String get message => 'Mensaje';

  @override
  String get messageHint => 'Unas palabras para tus vecinos';

  @override
  String get visibilityNote =>
      'Tu apodo, mensaje y foto los verá cualquiera que tenga el enlace de este pueblo.';

  @override
  String get submitHouse => 'Terminar mi casa';

  @override
  String get submitting => 'Construyendo…';

  @override
  String moveToSlot(int slot) {
    return 'Pasar al lote vacío $slot';
  }

  @override
  String frameTitle(String name) {
    return 'La casita de $name';
  }

  @override
  String get noMessage => 'Sin mensaje.';

  @override
  String joinedOn(String date) {
    return 'Se mudó el $date';
  }

  @override
  String get report => 'Denunciar contenido inapropiado';

  @override
  String get reported => 'Denuncia recibida. La revisaremos.';

  @override
  String get removeMine => 'Vaciar mi casa';

  @override
  String get removeAsOwner => 'Vaciar esta casa (dueño)';

  @override
  String get removeConfirm =>
      '¿Vaciar esta casa? Se borrarán su foto y su mensaje.';

  @override
  String get cancel => 'Cancelar';

  @override
  String get removeButton => 'Vaciar casa';

  @override
  String get photoLoadFailed => 'No se pudo cargar la foto.';

  @override
  String get inviteTitle => 'Invitar amigos';

  @override
  String inviteBody(int count) {
    return 'Casas vacías: $count.';
  }

  @override
  String get copyLink => 'Copiar enlace';

  @override
  String get linkCopied => 'Enlace de invitación copiado.';

  @override
  String get shareLink => 'Compartir';

  @override
  String get inviteNote => 'Compártelo solo con gente de confianza.';

  @override
  String shareText(String url) {
    return '¡Construye una casa en nuestro pueblo de invierno! $url';
  }

  @override
  String litUp(String name) {
    return '¡Se encendió la casa de $name!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Tu casa está lista, pero la foto no se subió. Toca tu casa para intentarlo de nuevo.';

  @override
  String get alreadyHaveHouse => 'Ya tienes una casa aquí.';

  @override
  String houseRemoved(String name) {
    return 'Se vació la casa de $name.';
  }

  @override
  String get openLinkTitle => 'Abrir un enlace de invitación';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Abrir';

  @override
  String get linkInvalid => 'Revisa el enlace de invitación.';

  @override
  String get nameRequired => 'Escribe un nombre para el pueblo.';

  @override
  String get nameTooLong => 'Usa 20 caracteres o menos.';

  @override
  String get nicknameRequired => 'Escribe un apodo.';

  @override
  String get nicknameTooLong => 'Usa 10 caracteres o menos.';

  @override
  String get messageTooLong => 'Usa 60 caracteres o menos.';

  @override
  String get errRateLimited =>
      'Demasiadas solicitudes. Inténtalo en un momento.';

  @override
  String get errNetwork => 'Sin conexión. Revisa tu red e inténtalo de nuevo.';

  @override
  String get errForbidden => 'No tienes permiso para hacer eso.';

  @override
  String get errPhotoTooLarge => 'La foto es demasiado grande.';

  @override
  String get errPhotoUnsupported => 'Formato de foto no compatible.';

  @override
  String get errNotFound => 'No encontrado.';

  @override
  String get errServer => 'Algo salió mal. Inténtalo en un momento.';

  @override
  String get errSlotTaken =>
      'Alguien acaba de ocupar este lote. Guardamos tu borrador: elige otro lote vacío.';

  @override
  String get errVillageFull =>
      'Todos los lotes abiertos están ocupados. Amplía el pueblo o crea uno nuevo.';

  @override
  String get errAlreadyJoined =>
      'Este dispositivo ya tiene una casa en este pueblo.';

  @override
  String get errNoServer =>
      'No hay servidor configurado (versión de desarrollo).';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'Amigos que faltan para «$reward»: $remaining 🎁';
  }

  @override
  String get decorSled => 'Trineo de regalos';

  @override
  String get decorSnowFamily => 'Familia de muñecos de nieve';

  @override
  String get decorAurora => 'Cielo con aurora';

  @override
  String get growBig => 'Ampliar el pueblo';

  @override
  String upgradePointLots(int count) {
    return 'Se abren $count lotes bloqueados.';
  }

  @override
  String get useCredit => 'Usar un pase que tienes';

  @override
  String get upgradeWaiting => 'Confirmando tu compra…';

  @override
  String get restorePurchases => 'Restaurar compras';

  @override
  String get restored => 'Compras restauradas.';

  @override
  String get purchasesUnavailable => 'Compras disponibles pronto';

  @override
  String get errNoCredit => 'No tienes pases disponibles.';

  @override
  String get errAlreadyBig =>
      'Este pueblo ya está en su tamaño máximo (60 casas).';

  @override
  String get errPurchaseFailed =>
      'La compra no se completó. Inténtalo de nuevo.';

  @override
  String get errPurchasePending =>
      'El pago se hizo, pero la confirmación está tardando. Vuelve en un rato y se aplicará solo.';

  @override
  String get doorDirection => 'Dirección de la puerta';

  @override
  String get dirFrontLeft => 'Delante izq.';

  @override
  String get dirFrontRight => 'Delante der.';

  @override
  String get dirBackRight => 'Detrás der.';

  @override
  String get dirBackLeft => 'Detrás izq.';

  @override
  String get dirTowardCentre => 'Hacia el centro';

  @override
  String districtOpened(String name) {
    return '¡Se abrieron 3 lotes nuevos en $name!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (aún cerrada) · ábrela ampliando el pueblo';
  }

  @override
  String get pickDistrict => '¿Qué calle abrimos?';

  @override
  String get districtHalf => 'Medio abierta';

  @override
  String buyDistrict(String price) {
    return 'Ampliar por $price';
  }

  @override
  String maxVillage(int max) {
    return 'Ya es el pueblo más grande ($max)';
  }

  @override
  String get editLook => '🎨 Decorar';

  @override
  String get editLookMenu => 'Decorar (caminos y adornos)';

  @override
  String get pathStyleTitle => 'Camino';

  @override
  String get pathDirt => 'Tierra';

  @override
  String get pathStones => 'Piedras';

  @override
  String get pathBrick => 'Ladrillo';

  @override
  String get pathSnow => 'Nieve';

  @override
  String get lookHint => 'Arrastra el aro bajo un adorno para moverlo.';

  @override
  String get resetDecor => 'Restablecer adornos';

  @override
  String get saveLook => 'Guardar';

  @override
  String get savingLook => 'Guardando…';

  @override
  String get lookSaved => 'Se guardó la decoración del pueblo.';
}
