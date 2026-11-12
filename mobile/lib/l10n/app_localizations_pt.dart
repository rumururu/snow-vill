// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Uma vila de inverno\nque você constrói com amigos';

  @override
  String get taglineBody =>
      'Um amigo, uma casa. Abra ruas ao redor da praça da catedral e amplie a vila até 60 casas — cada rua ganha uma atração, como pista de gelo ou a casa do Papai Noel. As fotos só aparecem ao tocar em uma casa.';

  @override
  String get createVillage => 'Criar uma vila';

  @override
  String get openByLink => 'Abrir um link de convite';

  @override
  String get myVillages => 'Minhas vilas';

  @override
  String get noVillages =>
      'Nenhuma vila ainda. Crie uma ou abra o link de convite de um amigo.';

  @override
  String get privacyPolicy => 'Política de privacidade';

  @override
  String get createHeading => 'Dê um nome à sua vila';

  @override
  String get villageNameHint => 'ex.: Vila Floco de Neve';

  @override
  String get createCapacity =>
      'Até 6 amigos se mudam de graça; abra mais ruas para ampliar a vila até 60 casas.';

  @override
  String get createButton => 'Criar vila';

  @override
  String get creating => 'Criando…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return 'Ainda cabem mais $count';
  }

  @override
  String get villageComplete => 'Vila completa';

  @override
  String get tapHint =>
      'Toque numa casa acesa para ver o porta-retrato, ou numa vazia para se mudar.';

  @override
  String get makeMyHouse => 'Criar minha casa';

  @override
  String get myHouse => 'Minha casa';

  @override
  String get invite => 'Convidar amigos';

  @override
  String get deleteVillage => 'Excluir vila';

  @override
  String get deleteConfirmTitle => 'Excluir esta vila?';

  @override
  String deleteConfirmBody(int count) {
    return 'Todas as casas ($count), fotos e recados serão excluídos para sempre.';
  }

  @override
  String get deleteButton => 'Excluir vila e todas as casas';

  @override
  String get loadFailed => 'Não foi possível carregar a vila';

  @override
  String get retry => 'Tentar de novo';

  @override
  String get notFoundTitle => 'Vila não encontrada';

  @override
  String get notFoundBody => 'O link pode estar errado ou a vila foi excluída.';

  @override
  String claimTitle(int slot) {
    return 'Construir no terreno $slot';
  }

  @override
  String get firstHouseIntro =>
      'Sua vila está pronta! Vamos construir a primeira casa?';

  @override
  String get nickname => 'Apelido';

  @override
  String get nicknameHint => 'Um nome que seus amigos reconheçam';

  @override
  String get houseStyle => 'Tipo de casa';

  @override
  String get styleWood => 'Madeira';

  @override
  String get styleSage => 'Sálvia';

  @override
  String get styleIndigo => 'Índigo';

  @override
  String get photo => 'Foto';

  @override
  String get optional => '(opcional)';

  @override
  String get choosePhoto => 'Escolher foto';

  @override
  String get changePhoto => 'Trocar foto';

  @override
  String get addPhoto => 'Adicionar foto';

  @override
  String get removePhoto => 'Remover foto';

  @override
  String get photoHint =>
      'A foto é opcional. Ela é cortada em quadrado e os dados de localização (EXIF) são removidos.';

  @override
  String get message => 'Recado';

  @override
  String get messageHint => 'Um recado para os vizinhos';

  @override
  String get visibilityNote =>
      'Seu apelido, recado e foto ficam visíveis para quem tiver o link desta vila.';

  @override
  String get submitHouse => 'Concluir minha casa';

  @override
  String get submitting => 'Construindo…';

  @override
  String moveToSlot(int slot) {
    return 'Mudar para o terreno vazio $slot';
  }

  @override
  String frameTitle(String name) {
    return 'A casinha de $name';
  }

  @override
  String get noMessage => 'Sem recado.';

  @override
  String joinedOn(String date) {
    return 'Mudou-se em $date';
  }

  @override
  String get report => 'Denunciar conteúdo impróprio';

  @override
  String get reported => 'Denúncia recebida. Vamos analisar.';

  @override
  String get removeMine => 'Desocupar minha casa';

  @override
  String get removeAsOwner => 'Desocupar (dono da vila)';

  @override
  String get removeConfirm =>
      'Desocupar esta casa? A foto e o recado serão excluídos.';

  @override
  String get cancel => 'Cancelar';

  @override
  String get removeButton => 'Desocupar casa';

  @override
  String get photoLoadFailed => 'Não foi possível carregar a foto.';

  @override
  String get inviteTitle => 'Convidar amigos';

  @override
  String inviteBody(int count) {
    return 'Convide amigos para completar a vila. Casas livres: $count.';
  }

  @override
  String get copyLink => 'Copiar link';

  @override
  String get linkCopied => 'Link de convite copiado.';

  @override
  String get shareLink => 'Compartilhar';

  @override
  String get inviteNote =>
      'Qualquer pessoa com o link pode ver a vila e se mudar para uma casa vazia. Compartilhe só com quem você confia.';

  @override
  String shareText(String url) {
    return 'Construa uma casa na nossa vila de inverno! $url';
  }

  @override
  String litUp(String name) {
    return 'A casa de $name acendeu!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Sua casa está pronta, mas a foto não foi enviada. Toque na sua casa para tentar de novo.';

  @override
  String get alreadyHaveHouse =>
      'Você já tem uma casa aqui. Convide amigos para ocupar o resto!';

  @override
  String houseRemoved(String name) {
    return 'A casa de $name foi desocupada.';
  }

  @override
  String get openLinkTitle => 'Abrir um link de convite';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Abrir';

  @override
  String get linkInvalid => 'Confira o link de convite.';

  @override
  String get nameRequired => 'Digite um nome para a vila.';

  @override
  String get nameTooLong => 'Use até 20 caracteres.';

  @override
  String get nicknameRequired => 'Digite um apelido.';

  @override
  String get nicknameTooLong => 'Use até 10 caracteres.';

  @override
  String get messageTooLong => 'Use até 60 caracteres.';

  @override
  String get errRateLimited =>
      'Muitas solicitações. Tente de novo em instantes.';

  @override
  String get errNetwork =>
      'Você está offline. Verifique a conexão e tente de novo.';

  @override
  String get errForbidden => 'Você não tem permissão para fazer isso.';

  @override
  String get errPhotoTooLarge => 'A foto é grande demais.';

  @override
  String get errPhotoUnsupported => 'Formato de foto não suportado.';

  @override
  String get errNotFound => 'Não encontrado.';

  @override
  String get errServer => 'Algo deu errado. Tente de novo em instantes.';

  @override
  String get errSlotTaken =>
      'Alguém acabou de ocupar este terreno. Seu rascunho foi mantido — escolha outro terreno vazio.';

  @override
  String get errVillageFull =>
      'Todos os terrenos abertos estão ocupados. Amplie a vila ou crie uma nova.';

  @override
  String get errAlreadyJoined => 'Este aparelho já tem uma casa nesta vila.';

  @override
  String get errNoServer =>
      'Nenhum servidor configurado (versão de desenvolvimento).';

  @override
  String milestoneHint(int remaining, String reward) {
    return 'Mais $remaining amigo(s) para liberar “$reward” 🎁';
  }

  @override
  String get decorSled => 'Trenó de presentes';

  @override
  String get decorSnowFamily => 'Família de bonecos de neve';

  @override
  String get decorAurora => 'Céu com aurora';

  @override
  String get growBig => 'Ampliar a vila';

  @override
  String upgradePointLots(int count) {
    return '$count terrenos bloqueados são liberados.';
  }

  @override
  String upgradePointAurora(int big) {
    return 'Quando todas as $big casas estiverem ocupadas, uma aurora ilumina o céu.';
  }

  @override
  String get upgradePointGift =>
      'Qualquer um pode ampliar a vila, não só o dono; vale para todos na web e no app.';

  @override
  String get useCredit => 'Usar um passe que você tem';

  @override
  String get upgradeWaiting => 'Confirmando sua compra…';

  @override
  String get restorePurchases => 'Restaurar compras';

  @override
  String get restored => 'Compras restauradas.';

  @override
  String get purchasesUnavailable => 'Compras em breve';

  @override
  String get errNoCredit => 'Nenhum passe disponível.';

  @override
  String get errAlreadyBig => 'Esta vila já está no tamanho máximo (60 casas).';

  @override
  String get errPurchaseFailed => 'A compra não foi concluída. Tente de novo.';

  @override
  String get errPurchasePending =>
      'Pagamento feito, mas a confirmação está demorando. Abra de novo em instantes e ele será aplicado.';

  @override
  String get tapHintFull =>
      'Toque numa casa para abrir os porta-retratos dos seus amigos.';

  @override
  String get doorDirection => 'Direção da porta';

  @override
  String get dirFrontLeft => 'Frente esq.';

  @override
  String get dirFrontRight => 'Frente dir.';

  @override
  String get dirBackRight => 'Fundo dir.';

  @override
  String get dirBackLeft => 'Fundo esq.';

  @override
  String get dirTowardCentre => 'Para o centro';

  @override
  String districtOpened(String name) {
    return '3 novos terrenos abertos na $name!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (ainda fechada) · abra ampliando a vila';
  }

  @override
  String expandBody(int capacity, int step) {
    return 'Esta vila tem $capacity casas. Escolha uma rua para abrir mais $step terrenos (cada rua tem 6, abertos em duas etapas).';
  }

  @override
  String get pickDistrict => 'Rua a abrir';

  @override
  String get districtNew => 'Rua nova · 3 casas';

  @override
  String get districtHalf => 'Meio aberta · últimos 3';

  @override
  String buyDistrict(String price) {
    return 'Ampliar por $price';
  }

  @override
  String priceLadder(String p1, String p2, String p3, String p4, int max) {
    return '6 grátis → 9 por $p1 → 12 por $p2 → 15 por $p3 → depois $p4 a cada 3 (até $max)';
  }

  @override
  String maxVillage(int max) {
    return 'Tamanho máximo ($max)';
  }

  @override
  String get editLook => '🎨 Decorar';

  @override
  String get editLookMenu => 'Decorar (caminhos e enfeites)';

  @override
  String get pathStyleTitle => 'Caminho';

  @override
  String get pathDirt => 'Terra';

  @override
  String get pathStones => 'Pedras';

  @override
  String get pathBrick => 'Tijolo';

  @override
  String get pathSnow => 'Neve';

  @override
  String get lookHint =>
      'Arraste o anel sob um enfeite para movê-lo. Não sobre casas, caminhos ou marcos, nem fora da vila.';

  @override
  String get resetDecor => 'Redefinir enfeites';

  @override
  String get saveLook => 'Salvar';

  @override
  String get savingLook => 'Salvando…';

  @override
  String get lookSaved => 'Decoração da vila salva.';
}
