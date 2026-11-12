import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** French translation of ko.tsx. */
export default function PolicyFr() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-night/70">
        Éditeur : mkideabox · Contact : <Mail /> · Date d’entrée en vigueur : {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Résumé">
        <p>
          Snow Village (ci-après le « Service ») ne demande aucune inscription et ne collecte ni nom, ni adresse e-mail, ni numéro de
          téléphone. Nous traitons le nom du village, le pseudo et le petit mot que vous saisissez vous-même, ainsi qu’une photo que
          vous choisissez d’ajouter, afin de les afficher dans le village. Les photos sont conservées dans un stockage privé, et non
          public, et ne sont affichées que via une adresse valable peu de temps, lorsque quelqu’un touche la maison dans le village.
          Nous n’utilisons aucun outil publicitaire ni d’analyse.
        </p>
      </Section>

      <Section n={2} title="Informations traitées et finalités">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Nom du village</b> (obligatoire) : pour créer et afficher le village.
          </li>
          <li>
            <b>Pseudo et style de maison</b> (obligatoires), <b>petit mot</b> (facultatif, 60 caractères maximum) : pour afficher
            votre maison dans le village.
          </li>
          <li>
            <b>Photo</b> (facultative, 1) : pour l’afficher dans le cadre photo de votre maison. Lors de l’envoi, elle est recadrée en
            carré et réduite à 512 px, et ses métadonnées (EXIF), comme le lieu de prise de vue (GPS), sont supprimées à la fois sur
            l’appareil et sur le serveur.
          </li>
          <li>
            <b>Identifiant d’installation aléatoire</b> : un numéro aléatoire créé par le navigateur lors de la première visite. Il
            sert à empêcher un même navigateur de construire deux maisons dans un village et à bloquer l’envoi d’un trop grand nombre
            de requêtes en peu de temps. Ce n’est ni un identifiant publicitaire ni un identifiant d’appareil.
          </li>
          <li>
            <b>Journal des requêtes</b> (identifiant d’installation, type de requête, heure) : utilisé pour prévenir les abus et
            supprimé automatiquement au bout d’un jour.
          </li>
          <li>
            <b>Historique des achats intégrés</b> (lors de l’achat d’un agrandissement du village dans l’application Snow Village) :
            identifiant d’installation (utilisé comme compte d’achat), numéro de transaction, produit, montant et devise du paiement,
            boutique (App Store / Google Play), heure d’achat et de remboursement, et village sur lequel le pass a été utilisé. Il
            sert à vérifier l’achat, à l’appliquer au village et à traiter les remboursements. Les informations de paiement, comme le
            numéro de carte, sont traitées par Apple ou Google ; le Service ne les reçoit pas.
          </li>
          <li>
            <b>Contenu des signalements</b> : si vous signalez une maison inappropriée, nous conservons la maison concernée, l’heure du
            signalement et l’identifiant d’installation de la personne qui signale, afin de vérifier et d’agir.
          </li>
          <li>
            <b>Journaux de connexion</b> : lorsque vous ouvrez le site, l’adresse IP, les informations du navigateur, etc. peuvent être
            traitées dans les systèmes de l’hébergeur (Cloudflare) et du fournisseur de serveurs (Supabase) pour fournir le Service et
            en assurer la sécurité. L’éditeur ne les collecte ni ne les stocke séparément.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Qui peut les voir">
        <p>
          Toute personne disposant du lien d’un village peut voir le nom du village ainsi que le pseudo, le petit mot et la date
          d’emménagement de chaque maison ; en touchant une maison, elle peut voir la photo, et elle peut emménager dans une maison
          vide. N’envoyez le lien qu’à des personnes de confiance. L’image de la carte de partage du village ne contient ni photos, ni
          pseudos, ni petits mots. Le Service est configuré pour ne pas apparaître dans les moteurs de recherche.
        </p>
      </Section>

      <Section n={4} title="Informations enregistrées dans le navigateur">
        <p>
          Le Service ne crée pas lui-même de cookies. Toutefois, Cloudflare, placé devant le serveur (Supabase), peut définir un
          cookie de sécurité (__cf_bm, 30 minutes) pour bloquer les attaques automatisées. Nous enregistrons dans le stockage local du
          navigateur (localStorage) l’identifiant d’installation et une valeur secrète qui vous permet de gérer les villages que vous
          avez créés et votre maison. Le serveur ne conserve pas cette valeur secrète elle-même, mais uniquement une valeur
          transformée de manière irréversible (hachage). Si vous effacez les données du site dans le navigateur, cette valeur secrète
          disparaît aussi et vous ne pourrez plus, depuis ce navigateur, vider votre maison ni supprimer le village. Dans ce cas,
          faites-en la demande à l’adresse e-mail ci-dessous. Ce que vous faites dans le village d’exemple reste uniquement dans le
          stockage temporaire de cet onglet (sessionStorage) et n’est pas envoyé au serveur.
        </p>
        <p>
          Vous pouvez bloquer le cookie de sécurité dans les paramètres du navigateur, mais l’accès risque alors de ne pas fonctionner
          correctement. Le stockage local peut être effacé en supprimant les données du site dans le navigateur ; les droits de
          gestion mentionnés ci-dessus disparaissent alors aussi.
        </p>
      </Section>

      <Section n={5} title="Durée de conservation et suppression">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Si vous touchez votre maison et choisissez <b>« Vider ma maison »</b>, le pseudo, le petit mot et la photo de cette maison
            sont supprimés immédiatement.
          </li>
          <li>
            La personne qui a créé le village peut supprimer en une fois le village, toutes les maisons, les photos et les
            signalements associés avec <b>« Supprimer le village »</b>. Elle peut aussi vider les autres maisons du village.
          </li>
          <li>
            Les informations non supprimées sont conservées jusqu’à ce que l’utilisateur les supprime ou jusqu’à la fin du Service ;
            à la fin du Service, elles sont toutes supprimées.
          </li>
          <li>Les journaux de requêtes sont supprimés automatiquement au bout d’un jour.</li>
          <li>
            L’historique des achats intégrés est conservé 5 ans en tant que registre relatif au paiement et à la fourniture de biens,
            conformément à la loi coréenne sur la protection des consommateurs dans le commerce électronique, puis détruit.
          </li>
          <li>
            Si vous ne pouvez pas supprimer vous-même vos informations parce que vous avez effacé les données du navigateur, envoyez
            le lien du village et votre pseudo à <Mail />. Nous les supprimerons après vérification.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Procédure et méthode de destruction">
        <p>
          Les informations faisant l’objet d’une demande de suppression ou dont la durée de conservation a expiré sont détruites sans
          délai. Comme elles ne sont conservées que sous forme de fichiers électroniques, elles sont effacées de la base de données et
          du stockage des photos de manière irrécupérable, et ne sont ni imprimées ni conservées sur papier.
        </p>
      </Section>

      <Section n={7} title="Sous-traitants et transferts hors de Corée">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (États-Unis) — Tâches confiées : stockage de la base de données et des photos, fonctions serveur.
            Données traitées : informations sur le village et les maisons de la section 2, photos, identifiant d’installation,
            journaux de requêtes, contenu des signalements. Lieu de stockage : région de Séoul (ap-northeast-2). Moment et mode du
            transfert : envoi par Internet à chaque utilisation du Service. Durée de conservation : identique à la section 5.
            Contact : <Ext href="https://supabase.com/contact">supabase.com/contact</Ext> ·{" "}
            <Ext href="https://supabase.com/privacy">Politique de confidentialité</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (États-Unis) — Tâches confiées : vérification des achats intégrés et transmission de l’historique
            d’achat. Données traitées : identifiant d’installation, numéro de transaction, produit, prix, boutique. Moment et mode du
            transfert : envoi par Internet lors d’un achat dans l’application. Durée de conservation : selon la politique de
            RevenueCat. Contact : <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — Traitement des paiements des achats intégrés (selon les conditions et la politique de
            confidentialité de chaque boutique).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (États-Unis, réseau mondial) — Tâches confiées : diffusion et sécurité du site web (y compris en
            amont du serveur Supabase). Données traitées : informations de connexion telles que l’adresse IP et les informations du
            navigateur. Moment et mode du transfert : envoi par Internet à chaque accès au site. Durée de conservation : selon la
            politique de Cloudflare. Contact : privacyquestions@cloudflare.com ·{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Politique de confidentialité</Ext>
          </li>
        </ul>
        <p>
          Ces informations sont indispensables à la fourniture du Service ; si vous ne souhaitez pas ce transfert hors de Corée, vous
          pouvez ne pas utiliser le Service ou supprimer vos informations selon les modalités de la section 5. Sauf lorsque la loi
          l’exige, nous ne communiquons pas les informations à d’autres tiers, ne les vendons pas et ne les utilisons pas à des fins
          publicitaires.
        </p>
      </Section>

      <Section n={8} title="Mesures de sécurité">
        <p>
          Toutes les communications sont chiffrées en HTTPS. Les photos sont conservées dans un stockage privé sans adresse publique
          et affichées via une adresse valable seulement 2 minutes. La base de données n’est accessible qu’au travers des fonctions
          du Service, et les valeurs secrètes de gestion ne sont stockées que sous forme de hachage. Le serveur vérifie à nouveau la
          longueur des saisies ainsi que le format et la taille des photos, et limite le nombre de requêtes.
        </p>
      </Section>

      <Section n={9} title="Données personnelles des enfants">
        <p>
          Le Service ne s’adresse pas aux enfants de moins de 14 ans et ne traite pas sciemment les informations d’enfants de moins de
          14 ans. Si vous apprenez que des informations d’un enfant de moins de 14 ans ont été publiées, signalez-le à <Mail />. Nous
          les supprimerons après vérification.
        </p>
      </Section>

      <Section n={10} title="Droits des utilisateurs">
        <p>
          Vous pouvez demander à consulter, corriger ou supprimer vos informations, et demander l’arrêt de leur traitement. Écrivez-nous
          à l’adresse ci-dessus : nous traiterons votre demande sans délai et vous informerons du résultat.
        </p>
      </Section>

      <Section n={11} title="Voies de recours">
        <p>
          Si vous avez besoin de conseils ou souhaitez régler un litige concernant une atteinte à vos données personnelles, vous pouvez
          contacter les organismes (coréens) ci-dessous.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Comité de médiation des litiges sur les données personnelles : 1833-6972 (www.kopico.go.kr)</li>
          <li>Centre de signalement des atteintes à la vie privée : 118 (privacy.kisa.or.kr)</li>
          <li>Parquet suprême : 1301 (www.spo.go.kr)</li>
          <li>Agence nationale de police : 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Responsable de la protection des données et modifications">
        <p>
          Responsable de la protection des données : {OFFICER.name} · E-mail : <Mail to={OFFICER.email} /> · Téléphone :{" "}
          {OFFICER.phone}
        </p>
        <p>
          Questions sur le Service et demandes de suppression : <Mail to={CONTACT} />
        </p>
        <p>En cas de modification, la nouvelle politique sera publiée sur cette page avec sa nouvelle date d’entrée en vigueur.</p>
      </Section>
    </>
  );
}
