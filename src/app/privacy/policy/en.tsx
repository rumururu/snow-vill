import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** English translation of ko.tsx (same meaning and structure). */
export default function PolicyEn() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Privacy Policy</h1>
      <p className="mt-2 text-sm text-night/70">
        Operator: mkideabox · Contact: <Mail /> · Effective date: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Summary">
        <p>
          Snow Village (the &quot;Service&quot;) has no sign-up and does not collect names, email addresses or phone numbers. We
          process the village name, nickname and short message you enter yourself, and the one photo you choose to upload, in order
          to show them in the village. Photos are kept in private (not public) storage and are shown through a short-lived link only
          when someone taps a house in the village. We do not use advertising or analytics tools.
        </p>
      </Section>

      <Section n={2} title="Information we process and why">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Village name</b> (required): to create and display the village.
          </li>
          <li>
            <b>Nickname and house style</b> (required), <b>short message</b> (optional, up to 60 characters): to show your house in
            the village.
          </li>
          <li>
            <b>Photo</b> (optional, 1): to show in your house&apos;s photo frame. On upload it is cropped to a square and resized to
            512px, and metadata in the photo (EXIF), such as the location where it was taken (GPS), is removed both on your device and
            on the server.
          </li>
          <li>
            <b>Random install ID</b>: a random number your browser creates the first time. It is used to stop the same browser from
            building two houses in one village and to prevent too many requests in a short time. It is not an advertising ID or a
            device ID.
          </li>
          <li>
            <b>Request log</b> (install ID, request type, time): used to prevent abuse and deleted automatically after one day.
          </li>
          <li>
            <b>In-app purchase records</b> (when you buy a village expansion in the Snow Village app): install ID (used as the
            purchasing account), transaction number, product, amount and currency paid, store (App Store / Google Play), purchase and
            refund times, and the village the purchase was applied to. Used to verify purchases, apply them to the village and handle
            refunds. Payment method details such as card numbers are processed by Apple and Google; the Service does not receive them.
          </li>
          <li>
            <b>Reports</b>: when you report an inappropriate house, we keep the reported house, the time of the report and the
            reporting install ID in order to review and act on it.
          </li>
          <li>
            <b>Access logs</b>: when you open the website, your IP address, browser information and similar data may be processed on
            the systems of our hosting provider (Cloudflare) and server provider (Supabase) to provide and secure the Service. The
            operator does not separately collect or store this data.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Who can see it">
        <p>
          Anyone who has a village link can see that village&apos;s name and each house&apos;s nickname, short message and move-in
          date, can see the photo by tapping a house, and can move into an empty house. Please send the link only to people you
          trust. The village share card image does not include photos, nicknames or short messages. The Service is set up so that it
          is not shown in search engines.
        </p>
      </Section>

      <Section n={4} title="Information stored in your browser">
        <p>
          The Service does not set cookies itself. However, Cloudflare, which sits in front of our server (Supabase), may set a
          security cookie (__cf_bm, 30 minutes) to block automated attacks. Your browser&apos;s local storage (localStorage) holds
          the install ID and secret values that let you manage the villages you created and your own house. The server keeps only an
          irreversibly transformed value (hash) of these secrets, not the secrets themselves. If you clear the browser&apos;s site
          data, these secrets are lost and that browser can no longer empty your house or delete your village. In that case, please
          send a request to the email address below. Whatever you try in the sample village stays only in that tab&apos;s temporary
          storage (sessionStorage) and is not sent to the server.
        </p>
        <p>
          You can block the security cookie in your browser settings, but the site may not work smoothly if you do. You can clear
          local storage by deleting the browser&apos;s site data; doing so also removes the management rights described above.
        </p>
      </Section>

      <Section n={5} title="Retention and deletion">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Tap your house and choose <b>&apos;Empty my house&apos;</b> to delete that house&apos;s nickname, short message and photo
            immediately.
          </li>
          <li>
            The person who created a village can use <b>&apos;Delete village&apos;</b> to delete the village and all its houses,
            photos and related reports at once. The village creator can also empty other houses in the village.
          </li>
          <li>Information that is not deleted is kept until the user deletes it or the Service ends; if the Service ends, it is all deleted.</li>
          <li>Request logs are deleted automatically after one day.</li>
          <li>
            In-app purchase records are kept for 5 years as records of payment and supply of goods, as required by Korea&apos;s Act
            on Consumer Protection in Electronic Commerce, and then destroyed.
          </li>
          <li>
            If you cannot delete your information yourself because your browser data was cleared, send the village link and your
            nickname to <Mail />. We will verify and delete it.
          </li>
        </ul>
      </Section>

      <Section n={6} title="How information is destroyed">
        <p>
          Information is destroyed without delay once a deletion request is received or its retention period ends. Because it is kept
          only as electronic files, it is erased from the database and photo storage in a way that cannot be recovered; it is never
          printed or kept on paper.
        </p>
      </Section>

      <Section n={7} title="Service providers and international transfers">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (USA) — Task: database and photo storage, and server functions. Data: the village and house
            information in section 2, photos, install ID, request logs and reports. Storage location: Seoul region (ap-northeast-2).
            When and how transferred: sent over the internet each time you use the Service. Retention: as in section 5. Contact:{" "}
            <Ext href="https://supabase.com/contact">supabase.com/contact</Ext> ·{" "}
            <Ext href="https://supabase.com/privacy">Privacy Policy</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (USA) — Task: verifying in-app purchases and passing on purchase records. Data: install ID,
            transaction number, product, price, store. When and how transferred: sent over the internet when you make a purchase in
            the app. Retention: according to RevenueCat&apos;s policy. Contact:{" "}
            <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — processing of in-app purchase payments (under each store&apos;s terms and privacy policy).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (USA, global network) — Task: website delivery and security (including in front of the Supabase
            server). Data: access information such as IP address and browser information. When and how transferred: sent over the
            internet each time you access the website. Retention: according to Cloudflare&apos;s policy. Contact:
            privacyquestions@cloudflare.com ·{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Privacy Policy</Ext>
          </li>
        </ul>
        <p>
          This information is essential to provide the Service, so if you do not want it transferred abroad, you can choose not to
          use the Service or delete your information as described in section 5. Except where required by law, we do not provide
          information to any other third party, and we do not sell it or use it for advertising.
        </p>
      </Section>

      <Section n={8} title="How we keep it safe">
        <p>
          All communication is encrypted with HTTPS. Photos are kept in private storage with no public address and are shown through
          links that are valid for only 2 minutes. The database can be accessed only through the Service&apos;s functions, and
          management secrets are stored only as hashes. The server re-checks input length and photo format and size, and limits the
          number of requests.
        </p>
      </Section>

      <Section n={9} title="Children&apos;s privacy">
        <p>
          The Service is not directed at children under 14, and we do not knowingly process information of children under 14. If you
          become aware that information of a child under 14 has been posted, please let us know at <Mail />. We will verify and
          delete it.
        </p>
      </Section>

      <Section n={10} title="Your rights">
        <p>
          You can ask to see, correct or delete your information, and you can ask us to stop processing it. Contact us at the email
          address above and we will act without delay and let you know the result.
        </p>
      </Section>

      <Section n={11} title="Remedies for infringement">
        <p>If you need advice or dispute resolution about a privacy infringement, you can contact the following bodies (Korea).</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Personal Information Dispute Mediation Committee: 1833-6972 (www.kopico.go.kr)</li>
          <li>Personal Information Infringement Report Center (KISA): 118 (privacy.kisa.or.kr)</li>
          <li>Supreme Prosecutors&apos; Office: 1301 (www.spo.go.kr)</li>
          <li>Korean National Police Agency: 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Privacy officer and changes">
        <p>
          Privacy officer: {OFFICER.name} · Email: <Mail to={OFFICER.email} /> · Phone: {OFFICER.phone}
        </p>
        <p>
          Service inquiries and deletion requests: <Mail to={CONTACT} />
        </p>
        <p>If this policy changes, we will post it on this page with a new effective date.</p>
      </Section>
    </>
  );
}
