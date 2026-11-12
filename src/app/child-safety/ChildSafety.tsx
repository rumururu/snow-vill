"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { Ext, Mail, Section } from "../privacy/policy/shared";

export const CHILD_SAFETY_EFFECTIVE_DATE = "2026-11-12";
/** Child safety point of contact (the developer account contact declared to Google Play). */
export const CHILD_SAFETY_CONTACT = "mkideabox@gmail.com";

type Copy = {
  title: string;
  meta: string;
  sections: { title: string; items: string[] }[];
  /** Section 3: in-app report path; {report} = the button label in the app. */
  report: string;
  reportButton: string;
  mail: string;
  authorities: string;
  contact: string;
};

// Korean is the source; every translation keeps the same meaning and structure.
const COPY: Record<Locale, Copy> = {
  ko: {
    title: "아동 안전 표준",
    meta: "운영: mkideabox · 시행일",
    sections: [
      {
        title: "원칙",
        items: [
          "Snow Village는 아동 성적 학대 및 착취(CSAE)와 아동 성착취물(CSAM)을 어떤 형태로도 허용하지 않습니다.",
          "아동을 성적으로 묘사하거나 착취하는 사진·글, 아동에게 접근하거나 유인하려는 행위(그루밍)는 발견 즉시 삭제하고 아래 절차에 따라 신고합니다.",
          "서비스는 만 14세 미만 아동을 대상으로 하지 않습니다.",
        ],
      },
      {
        title: "서비스 설계상의 보호",
        items: [
          "마을은 링크를 받은 사람만 볼 수 있고, 검색 엔진에 노출되지 않습니다.",
          "채팅이나 1:1 메시지 기능이 없습니다. 집마다 닉네임, 짧은 한마디(60자), 사진 한 장만 올릴 수 있습니다.",
          "사진은 비공개 저장소에 두고 잠깐 유효한 주소로만 보여 주며, 촬영 위치 등 메타데이터를 지웁니다.",
          "마을을 만든 사람은 마을 안의 어떤 집이든 바로 비울 수 있습니다.",
        ],
      },
      { title: "신고 방법", items: [] },
      {
        title: "신고를 받으면",
        items: [
          "운영자가 신고된 내용을 확인하고, 아동 안전 위반이면 해당 집의 사진·닉네임·한마디를 지체 없이 삭제합니다.",
          "법령이 요구하는 경우 수사에 필요한 기록을 보존합니다.",
        ],
      },
    ],
    report: "앱이나 웹의 마을에서 해당 집을 누르고 '{report}'를 선택하세요.",
    reportButton: "부적절한 내용 신고하기",
    mail: "마을 링크와 집 닉네임을 적어 이메일로 신고할 수도 있습니다:",
    authorities:
      "아동 성착취물이 확인되면 관련 법령에 따라 수사기관(대한민국 경찰청 사이버범죄 신고시스템)과 미국 NCMEC(CyberTipline) 등 관할 당국에 신고합니다.",
    contact: "아동 안전 담당 연락처:",
  },
  en: {
    title: "Child Safety Standards",
    meta: "Operator: mkideabox · Effective date",
    sections: [
      {
        title: "Our standard",
        items: [
          "Snow Village does not allow child sexual abuse and exploitation (CSAE) or child sexual abuse material (CSAM) in any form.",
          "Photos or text that sexualize or exploit children, and any attempt to approach or lure a child (grooming), are removed as soon as they are found and reported as described below.",
          "The Service is not directed at children under 14.",
        ],
      },
      {
        title: "Protection by design",
        items: [
          "A village can only be seen by people who have its link, and it is not shown in search engines.",
          "There is no chat or direct messaging. Each house can only hold a nickname, a short message (60 characters) and one photo.",
          "Photos are kept in private storage, shown only through short-lived links, and stripped of metadata such as location.",
          "The person who created a village can immediately empty any house in it.",
        ],
      },
      { title: "How to report", items: [] },
      {
        title: "What happens after a report",
        items: [
          "The operator reviews the reported content and, if it violates child safety, deletes that house's photo, nickname and message without delay.",
          "Where the law requires it, records needed for an investigation are preserved.",
        ],
      },
    ],
    report: "In the app or on the web, tap the house in the village and choose “{report}”.",
    reportButton: "Report inappropriate content",
    mail: "You can also report by email with the village link and the house nickname:",
    authorities:
      "When child sexual abuse material is confirmed, we report it to the competent authorities as required by law, including the Korean National Police Agency (Cyber Crime Reporting System) and the US NCMEC (CyberTipline).",
    contact: "Child safety point of contact:",
  },
  ja: {
    title: "児童の安全に関する基準",
    meta: "運営: mkideabox · 施行日",
    sections: [
      {
        title: "基本方針",
        items: [
          "Snow Village は、児童への性的虐待・搾取（CSAE）および児童性的虐待コンテンツ（CSAM）をいかなる形でも認めません。",
          "児童を性的に描写・搾取する写真や文章、児童に近づいたり誘い出したりする行為（グルーミング）は、見つけ次第削除し、以下の手順で通報します。",
          "本サービスは14歳未満の児童を対象としていません。",
        ],
      },
      {
        title: "設計上の保護",
        items: [
          "村はリンクを受け取った人だけが見ることができ、検索エンジンには表示されません。",
          "チャットや個別メッセージの機能はありません。家ごとに投稿できるのは、ニックネーム、短いひとこと（60文字）、写真1枚だけです。",
          "写真は非公開のストレージに保存し、短時間だけ有効なアドレスでのみ表示します。撮影場所などのメタデータは削除します。",
          "村を作った人は、村の中のどの家でもすぐに空けることができます。",
        ],
      },
      { title: "通報方法", items: [] },
      {
        title: "通報を受けたら",
        items: [
          "運営者が通報内容を確認し、児童の安全に反する場合は、その家の写真・ニックネーム・ひとことを速やかに削除します。",
          "法令で求められる場合は、捜査に必要な記録を保存します。",
        ],
      },
    ],
    report: "アプリまたはウェブの村で該当する家をタップし、「{report}」を選んでください。",
    reportButton: "不適切な内容を通報",
    mail: "村のリンクと家のニックネームを書いて、メールで通報することもできます:",
    authorities:
      "児童性的虐待コンテンツが確認された場合は、法令に従い、韓国警察庁（サイバー犯罪通報システム）や米国 NCMEC（CyberTipline）などの関係当局に通報します。",
    contact: "児童の安全に関する窓口:",
  },
  zh: {
    title: "儿童安全标准",
    meta: "运营方：mkideabox · 生效日期",
    sections: [
      {
        title: "基本原则",
        items: [
          "Snow Village 不允许任何形式的儿童性虐待与剥削（CSAE）及儿童性虐待内容（CSAM）。",
          "对儿童进行性化描绘或剥削的照片和文字，以及接近或引诱儿童的行为（诱骗），一经发现立即删除，并按下述流程举报。",
          "本服务不面向14岁以下儿童。",
        ],
      },
      {
        title: "设计上的保护",
        items: [
          "只有收到链接的人才能看到小镇，小镇不会出现在搜索引擎中。",
          "没有聊天或私信功能。每栋房子只能发布昵称、一句话（60字以内）和一张照片。",
          "照片保存在私密存储中，只通过短时有效的链接显示，并会删除拍摄位置等元数据。",
          "小镇的创建者可以随时清空小镇里的任何一栋房子。",
        ],
      },
      { title: "举报方式", items: [] },
      {
        title: "收到举报后",
        items: [
          "运营者会核查被举报的内容；如违反儿童安全规定，会立即删除该房子的照片、昵称和留言。",
          "在法律要求时，保存调查所需的记录。",
        ],
      },
    ],
    report: "在应用或网页的小镇中点按该房子，然后选择“{report}”。",
    reportButton: "举报不当内容",
    mail: "也可以通过电子邮件举报，请附上小镇链接和房子昵称：",
    authorities:
      "一旦确认存在儿童性虐待内容，我们会依法向主管机关举报，包括韩国警察厅（网络犯罪举报系统）和美国 NCMEC（CyberTipline）。",
    contact: "儿童安全联系人：",
  },
  es: {
    title: "Normas de seguridad infantil",
    meta: "Operador: mkideabox · Fecha de entrada en vigor",
    sections: [
      {
        title: "Nuestra norma",
        items: [
          "Snow Village no permite en ninguna forma el abuso y la explotación sexual infantil (CSAE) ni el material de abuso sexual infantil (CSAM).",
          "Las fotos o textos que sexualicen o exploten a menores, y cualquier intento de acercarse a un menor o atraerlo (grooming), se eliminan en cuanto se detectan y se denuncian como se describe abajo.",
          "El Servicio no está dirigido a menores de 14 años.",
        ],
      },
      {
        title: "Protección desde el diseño",
        items: [
          "Un pueblo solo lo pueden ver quienes tienen su enlace y no aparece en los buscadores.",
          "No hay chat ni mensajes directos. Cada casa solo puede tener un apodo, un mensaje corto (60 caracteres) y una foto.",
          "Las fotos se guardan en almacenamiento privado, se muestran solo mediante enlaces de corta duración y se les quitan metadatos como la ubicación.",
          "Quien creó un pueblo puede vaciar al instante cualquier casa del pueblo.",
        ],
      },
      { title: "Cómo denunciar", items: [] },
      {
        title: "Qué pasa después de una denuncia",
        items: [
          "El operador revisa el contenido denunciado y, si infringe la seguridad infantil, elimina sin demora la foto, el apodo y el mensaje de esa casa.",
          "Cuando la ley lo exige, se conservan los registros necesarios para una investigación.",
        ],
      },
    ],
    report: "En la app o en la web, toca la casa en el pueblo y elige «{report}».",
    reportButton: "Denunciar contenido inapropiado",
    mail: "También puedes denunciar por correo indicando el enlace del pueblo y el apodo de la casa:",
    authorities:
      "Cuando se confirma material de abuso sexual infantil, lo denunciamos a las autoridades competentes según exige la ley, incluidas la Agencia Nacional de Policía de Corea (sistema de denuncia de ciberdelitos) y el NCMEC de EE. UU. (CyberTipline).",
    contact: "Contacto para seguridad infantil:",
  },
  fr: {
    title: "Normes de sécurité des enfants",
    meta: "Exploitant : mkideabox · Date d'entrée en vigueur",
    sections: [
      {
        title: "Notre règle",
        items: [
          "Snow Village n'autorise sous aucune forme les abus et l'exploitation sexuels des enfants (CSAE) ni les contenus d'abus sexuels sur enfants (CSAM).",
          "Les photos ou textes qui sexualisent ou exploitent des enfants, ainsi que toute tentative d'approcher ou d'attirer un enfant (pédopiégeage), sont supprimés dès qu'ils sont détectés et signalés comme décrit ci-dessous.",
          "Le Service ne s'adresse pas aux enfants de moins de 14 ans.",
        ],
      },
      {
        title: "Protection dès la conception",
        items: [
          "Un village n'est visible que par les personnes qui ont son lien, et il n'apparaît pas dans les moteurs de recherche.",
          "Il n'y a ni chat ni messagerie privée. Chaque maison ne peut contenir qu'un pseudo, un court message (60 caractères) et une photo.",
          "Les photos sont conservées dans un stockage privé, affichées uniquement via des liens à durée limitée, et débarrassées de métadonnées comme la localisation.",
          "La personne qui a créé un village peut vider immédiatement n'importe quelle maison de ce village.",
        ],
      },
      { title: "Comment signaler", items: [] },
      {
        title: "Après un signalement",
        items: [
          "L'exploitant examine le contenu signalé et, s'il enfreint la sécurité des enfants, supprime sans délai la photo, le pseudo et le message de la maison.",
          "Lorsque la loi l'exige, les données nécessaires à une enquête sont conservées.",
        ],
      },
    ],
    report: "Dans l'app ou sur le web, touchez la maison dans le village et choisissez « {report} ».",
    reportButton: "Signaler un contenu inapproprié",
    mail: "Vous pouvez aussi signaler par e-mail en indiquant le lien du village et le pseudo de la maison :",
    authorities:
      "Lorsqu'un contenu d'abus sexuel sur enfant est confirmé, nous le signalons aux autorités compétentes comme l'exige la loi, notamment l'Agence nationale de police de Corée (système de signalement de la cybercriminalité) et le NCMEC américain (CyberTipline).",
    contact: "Contact pour la sécurité des enfants :",
  },
  de: {
    title: "Standards zum Schutz von Kindern",
    meta: "Betreiber: mkideabox · Gültig ab",
    sections: [
      {
        title: "Unser Grundsatz",
        items: [
          "Snow Village duldet sexuellen Missbrauch und sexuelle Ausbeutung von Kindern (CSAE) sowie Darstellungen sexuellen Kindesmissbrauchs (CSAM) in keiner Form.",
          "Fotos oder Texte, die Kinder sexualisieren oder ausbeuten, sowie jeder Versuch, sich einem Kind zu nähern oder es anzulocken (Cybergrooming), werden sofort nach Bekanntwerden entfernt und wie unten beschrieben gemeldet.",
          "Der Dienst richtet sich nicht an Kinder unter 14 Jahren.",
        ],
      },
      {
        title: "Schutz durch Gestaltung",
        items: [
          "Ein Dorf ist nur für Personen sichtbar, die seinen Link haben, und erscheint nicht in Suchmaschinen.",
          "Es gibt keinen Chat und keine Direktnachrichten. Jedes Haus enthält nur einen Spitznamen, eine kurze Nachricht (60 Zeichen) und ein Foto.",
          "Fotos werden in einem privaten Speicher abgelegt, nur über kurzlebige Links angezeigt und von Metadaten wie dem Aufnahmeort befreit.",
          "Wer ein Dorf erstellt hat, kann jedes Haus darin sofort leeren.",
        ],
      },
      { title: "So meldest du Inhalte", items: [] },
      {
        title: "Nach einer Meldung",
        items: [
          "Der Betreiber prüft den gemeldeten Inhalt und löscht bei einem Verstoß gegen den Kinderschutz unverzüglich Foto, Spitznamen und Nachricht des Hauses.",
          "Soweit gesetzlich vorgeschrieben, werden für Ermittlungen erforderliche Daten aufbewahrt.",
        ],
      },
    ],
    report: "Tippe in der App oder im Web im Dorf auf das Haus und wähle „{report}“.",
    reportButton: "Unangemessenen Inhalt melden",
    mail: "Du kannst auch per E-Mail mit dem Dorf-Link und dem Spitznamen des Hauses melden:",
    authorities:
      "Wird Material über sexuellen Kindesmissbrauch bestätigt, melden wir es gemäß den gesetzlichen Vorgaben den zuständigen Behörden, darunter die Koreanische Nationalpolizei (Meldesystem für Cyberkriminalität) und das US-amerikanische NCMEC (CyberTipline).",
    contact: "Ansprechpartner für Kinderschutz:",
  },
  pt: {
    title: "Padrões de segurança infantil",
    meta: "Operador: mkideabox · Data de vigência",
    sections: [
      {
        title: "Nosso padrão",
        items: [
          "O Snow Village não permite, de nenhuma forma, abuso e exploração sexual infantil (CSAE) nem material de abuso sexual infantil (CSAM).",
          "Fotos ou textos que sexualizem ou explorem crianças, e qualquer tentativa de se aproximar de uma criança ou aliciá-la (grooming), são removidos assim que encontrados e denunciados conforme descrito abaixo.",
          "O Serviço não é destinado a menores de 14 anos.",
        ],
      },
      {
        title: "Proteção desde o design",
        items: [
          "Uma vila só pode ser vista por quem tem o link dela e não aparece em mecanismos de busca.",
          "Não há chat nem mensagens diretas. Cada casa só pode ter um apelido, um recado curto (60 caracteres) e uma foto.",
          "As fotos ficam em armazenamento privado, são exibidas apenas por links de curta duração e têm metadados como a localização removidos.",
          "Quem criou a vila pode esvaziar imediatamente qualquer casa dela.",
        ],
      },
      { title: "Como denunciar", items: [] },
      {
        title: "Depois de uma denúncia",
        items: [
          "O operador analisa o conteúdo denunciado e, se ele violar a segurança infantil, exclui sem demora a foto, o apelido e o recado daquela casa.",
          "Quando a lei exigir, os registros necessários para uma investigação são preservados.",
        ],
      },
    ],
    report: "No app ou na web, toque na casa da vila e escolha “{report}”.",
    reportButton: "Denunciar conteúdo impróprio",
    mail: "Você também pode denunciar por e-mail informando o link da vila e o apelido da casa:",
    authorities:
      "Quando um material de abuso sexual infantil é confirmado, nós o denunciamos às autoridades competentes conforme exige a lei, incluindo a Agência Nacional de Polícia da Coreia (sistema de denúncia de crimes cibernéticos) e o NCMEC dos EUA (CyberTipline).",
    contact: "Contato para segurança infantil:",
  },
  ru: {
    title: "Стандарты безопасности детей",
    meta: "Оператор: mkideabox · Дата вступления в силу",
    sections: [
      {
        title: "Наш принцип",
        items: [
          "Snow Village ни в какой форме не допускает сексуального насилия над детьми и их эксплуатации (CSAE), а также материалов сексуального насилия над детьми (CSAM).",
          "Фото и тексты, сексуализирующие или эксплуатирующие детей, а также любые попытки приблизиться к ребёнку или заманить его (груминг) удаляются сразу после обнаружения, и о них сообщается в порядке, описанном ниже.",
          "Сервис не предназначен для детей младше 14 лет.",
        ],
      },
      {
        title: "Защита на уровне устройства сервиса",
        items: [
          "Деревню видят только те, у кого есть ссылка на неё; в поисковых системах она не отображается.",
          "Нет чата и личных сообщений. В каждом доме можно разместить только никнейм, короткую подпись (60 символов) и одно фото.",
          "Фото хранятся в закрытом хранилище, показываются только по кратковременным ссылкам, а метаданные вроде места съёмки удаляются.",
          "Создатель деревни может сразу освободить любой дом в ней.",
        ],
      },
      { title: "Как сообщить о нарушении", items: [] },
      {
        title: "Что происходит после жалобы",
        items: [
          "Оператор проверяет контент и, если он нарушает правила безопасности детей, без промедления удаляет фото, никнейм и подпись этого дома.",
          "Если этого требует закон, сохраняются данные, необходимые для расследования.",
        ],
      },
    ],
    report: "В приложении или на сайте нажмите на дом в деревне и выберите «{report}».",
    reportButton: "Пожаловаться на контент",
    mail: "Также можно сообщить по электронной почте, указав ссылку на деревню и никнейм дома:",
    authorities:
      "Если наличие материалов сексуального насилия над детьми подтверждено, мы сообщаем об этом в компетентные органы в соответствии с законом, в том числе в Национальное полицейское агентство Кореи (система сообщений о киберпреступлениях) и американский NCMEC (CyberTipline).",
    contact: "Контакт по вопросам безопасности детей:",
  },
  id: {
    title: "Standar Keselamatan Anak",
    meta: "Pengelola: mkideabox · Tanggal berlaku",
    sections: [
      {
        title: "Standar kami",
        items: [
          "Snow Village tidak mengizinkan pelecehan dan eksploitasi seksual anak (CSAE) maupun materi pelecehan seksual anak (CSAM) dalam bentuk apa pun.",
          "Foto atau teks yang menyeksualisasi atau mengeksploitasi anak, serta setiap upaya mendekati atau membujuk anak (grooming), dihapus segera setelah ditemukan dan dilaporkan sesuai langkah di bawah.",
          "Layanan ini tidak ditujukan untuk anak di bawah 14 tahun.",
        ],
      },
      {
        title: "Perlindungan sejak desain",
        items: [
          "Desa hanya bisa dilihat oleh orang yang memiliki tautannya, dan tidak muncul di mesin pencari.",
          "Tidak ada fitur obrolan atau pesan langsung. Setiap rumah hanya berisi nama panggilan, pesan singkat (60 karakter), dan satu foto.",
          "Foto disimpan di penyimpanan pribadi, hanya ditampilkan melalui tautan berumur pendek, dan metadata seperti lokasi dihapus.",
          "Pembuat desa dapat langsung mengosongkan rumah mana pun di desanya.",
        ],
      },
      { title: "Cara melapor", items: [] },
      {
        title: "Setelah laporan diterima",
        items: [
          "Pengelola meninjau konten yang dilaporkan dan, jika melanggar keselamatan anak, segera menghapus foto, nama panggilan, dan pesan rumah tersebut.",
          "Jika diwajibkan hukum, catatan yang diperlukan untuk penyelidikan disimpan.",
        ],
      },
    ],
    report: "Di aplikasi atau web, ketuk rumah tersebut di desa lalu pilih “{report}”.",
    reportButton: "Laporkan konten tidak pantas",
    mail: "Anda juga dapat melapor lewat email dengan menyertakan tautan desa dan nama panggilan rumah:",
    authorities:
      "Jika materi pelecehan seksual anak terkonfirmasi, kami melaporkannya kepada otoritas yang berwenang sesuai ketentuan hukum, termasuk Kepolisian Nasional Korea (sistem pelaporan kejahatan siber) dan NCMEC Amerika Serikat (CyberTipline).",
    contact: "Kontak keselamatan anak:",
  },
};

export function ChildSafety() {
  const locale = useLocale();
  const t = useT();
  const c = COPY[locale];
  const [before, after = ""] = c.report.split("{report}");
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center gap-1">
        <Link href="/" aria-label={t("common.home")} className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5">
          ←
        </Link>
        <span className="text-sm font-semibold text-night/70">Snow Village</span>
      </header>
      <h1 className="mt-4 text-2xl font-extrabold text-night">{c.title}</h1>
      <p className="mt-2 text-sm text-night/70">
        {c.meta}: {CHILD_SAFETY_EFFECTIVE_DATE}
      </p>
      {c.sections.map((s, i) => (
        <Section key={s.title} n={i + 1} title={s.title}>
          {i === 2 ? (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                {before}
                <b>{c.reportButton}</b>
                {after}
              </li>
              <li>
                {c.mail} <Mail to={CHILD_SAFETY_CONTACT} />
              </li>
            </ul>
          ) : (
            <ul className="list-disc space-y-1.5 pl-5">
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
              {i === 3 && (
                <li>
                  {c.authorities} (<Ext href="https://ecrm.police.go.kr">ecrm.police.go.kr</Ext>,{" "}
                  <Ext href="https://report.cybertip.org">report.cybertip.org</Ext>)
                </li>
              )}
            </ul>
          )}
        </Section>
      ))}
      <Section n={5} title={c.contact.replace(/[:：]\s*$/, "")}>
        <p>
          {c.contact} <Mail to={CHILD_SAFETY_CONTACT} />
        </p>
      </Section>
    </main>
  );
}
