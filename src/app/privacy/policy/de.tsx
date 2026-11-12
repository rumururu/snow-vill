import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** German translation of ko.tsx. */
export default function PolicyDe() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-night/70">
        Betreiber: mkideabox · Kontakt: <Mail /> · Gültig ab: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Zusammenfassung">
        <p>
          Snow Village (im Folgenden „Dienst“) erfordert keine Registrierung und erhebt weder Namen noch E-Mail-Adresse noch
          Telefonnummer. Wir verarbeiten den Dorfnamen, den Spitznamen und die kurze Nachricht, die Sie selbst eingeben, sowie ein
          Foto, das Sie freiwillig hochladen, um sie im Dorf anzuzeigen. Fotos liegen nicht in einem öffentlichen, sondern in einem
          privaten Speicher und werden nur über eine kurzzeitig gültige Adresse angezeigt, wenn jemand im Dorf auf das Haus tippt.
          Wir verwenden keine Werbe- oder Analysetools.
        </p>
      </Section>

      <Section n={2} title="Verarbeitete Daten und Zwecke">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Dorfname</b> (Pflicht): um das Dorf zu erstellen und anzuzeigen.
          </li>
          <li>
            <b>Spitzname und Hausstil</b> (Pflicht), <b>kurze Nachricht</b> (optional, bis 60 Zeichen): um Ihr Haus im Dorf
            anzuzeigen.
          </li>
          <li>
            <b>Foto</b> (optional, 1 Stück): um es im Fotorahmen Ihres Hauses anzuzeigen. Beim Hochladen wird es quadratisch
            zugeschnitten und auf 512 px verkleinert; Metadaten im Foto (EXIF) wie der Aufnahmeort (GPS) werden sowohl auf dem Gerät
            als auch auf dem Server entfernt.
          </li>
          <li>
            <b>Zufällige Installations-ID</b>: eine Zufallsnummer, die der Browser beim ersten Besuch erzeugt. Sie verhindert, dass
            derselbe Browser in einem Dorf zwei Häuser baut, und dass in kurzer Zeit zu viele Anfragen gesendet werden. Sie ist keine
            Werbe-ID und keine Geräte-ID.
          </li>
          <li>
            <b>Anfrageprotokoll</b> (Installations-ID, Art der Anfrage, Zeitpunkt): dient der Missbrauchsverhinderung und wird nach
            einem Tag automatisch gelöscht.
          </li>
          <li>
            <b>In-App-Kaufdaten</b> (beim Kauf einer Dorferweiterung in der Snow Village App): Installations-ID (als Kaufkonto
            verwendet), Transaktionsnummer, Produkt, Zahlungsbetrag und Währung, Store (App Store / Google Play), Kauf- und
            Erstattungszeitpunkt sowie das Dorf, für das der Kauf eingelöst wurde. Sie dienen der Kaufbestätigung, der Anwendung auf
            das Dorf und der Abwicklung von Erstattungen. Zahlungsdaten wie Kartennummern verarbeiten Apple bzw. Google; der Dienst
            erhält sie nicht.
          </li>
          <li>
            <b>Inhalt von Meldungen</b>: Wenn Sie ein unangemessenes Haus melden, speichern wir das gemeldete Haus, den Zeitpunkt der
            Meldung und die Installations-ID der meldenden Person, um die Meldung zu prüfen und Maßnahmen zu ergreifen.
          </li>
          <li>
            <b>Zugriffsdaten</b>: Beim Aufrufen der Website können IP-Adresse, Browserinformationen usw. in den Systemen des
            Hosting-Anbieters (Cloudflare) und des Server-Anbieters (Supabase) zur Bereitstellung und Sicherheit des Dienstes
            verarbeitet werden. Der Betreiber sammelt oder speichert diese nicht gesondert.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Wer die Daten sehen kann">
        <p>
          Jede Person mit dem Link zu einem Dorf kann den Namen des Dorfes sowie Spitznamen, kurze Nachrichten und Einzugsdaten der
          Häuser sehen, beim Tippen auf ein Haus das Foto ansehen und in ein leeres Haus einziehen. Schicken Sie den Link nur an Menschen,
          denen Sie vertrauen. Das Bild der Teilen-Karte des Dorfes enthält keine Fotos, Spitznamen oder Nachrichten. Der Dienst ist so
          eingestellt, dass er nicht in Suchmaschinen erscheint.
        </p>
      </Section>

      <Section n={4} title="Im Browser gespeicherte Daten">
        <p>
          Der Dienst setzt selbst keine Cookies. Cloudflare, das dem Server (Supabase) vorgeschaltet ist, kann jedoch ein
          Sicherheits-Cookie (__cf_bm, 30 Minuten) setzen, um automatisierte Angriffe abzuwehren. Im lokalen Speicher des Browsers
          (localStorage) speichern wir die Installations-ID und einen geheimen Wert, mit dem Sie Ihre selbst erstellten Dörfer und Ihr
          Haus verwalten können. Der Server speichert nicht diesen geheimen Wert selbst, sondern nur einen unumkehrbar umgewandelten
          Wert (Hash). Wenn Sie die Websitedaten im Browser löschen, geht auch dieser geheime Wert verloren, und Sie können in diesem
          Browser Ihr Haus nicht mehr räumen und das Dorf nicht mehr löschen. Bitte wenden Sie sich in diesem Fall per E-Mail an die
          unten genannte Adresse. Was Sie im Beispieldorf ausprobieren, bleibt nur im temporären Speicher dieses Tabs (sessionStorage)
          und wird nicht an den Server gesendet.
        </p>
        <p>
          Das Sicherheits-Cookie können Sie in den Browsereinstellungen blockieren; dann funktioniert der Zugriff aber möglicherweise
          nicht reibungslos. Den lokalen Speicher können Sie löschen, indem Sie die Websitedaten im Browser löschen; dabei gehen auch die
          oben genannten Verwaltungsrechte verloren.
        </p>
      </Section>

      <Section n={5} title="Speicherdauer und Löschung">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Wenn Sie auf Ihr Haus tippen und <b>„Mein Haus räumen“</b> wählen, werden Spitzname, Nachricht und Foto dieses Hauses
            sofort gelöscht.
          </li>
          <li>
            Wer das Dorf erstellt hat, kann mit <b>„Dorf löschen“</b> das Dorf mit allen Häusern, Fotos und zugehörigen Meldungen auf
            einmal löschen. Wer das Dorf erstellt hat, kann auch andere Häuser im Dorf räumen.
          </li>
          <li>
            Nicht gelöschte Daten werden gespeichert, bis die Nutzerin oder der Nutzer sie löscht oder der Dienst eingestellt wird;
            bei Einstellung des Dienstes werden alle Daten gelöscht.
          </li>
          <li>Anfrageprotokolle werden nach einem Tag automatisch gelöscht.</li>
          <li>
            In-App-Kaufdaten werden gemäß dem koreanischen Gesetz über den Verbraucherschutz im elektronischen Geschäftsverkehr als
            Aufzeichnungen über Zahlung und Warenlieferung 5 Jahre lang aufbewahrt und danach vernichtet.
          </li>
          <li>
            Wenn Sie Ihre Daten nicht selbst löschen können, weil Sie die Browserdaten gelöscht haben, schicken Sie den Link des Dorfes und
            Ihren Spitznamen an <Mail />. Nach Prüfung löschen wir sie.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Verfahren und Methode der Vernichtung">
        <p>
          Daten, zu denen eine Löschanfrage eingeht oder deren Speicherdauer abgelaufen ist, werden unverzüglich vernichtet. Da sie
          nur als elektronische Dateien gespeichert werden, werden sie aus der Datenbank und dem Fotospeicher auf eine nicht
          wiederherstellbare Weise gelöscht; sie werden nicht ausgedruckt oder auf Papier aufbewahrt.
        </p>
      </Section>

      <Section n={7} title="Auftragsverarbeiter und Übermittlung ins Ausland">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (USA) — Beauftragte Tätigkeit: Speicherung von Datenbank und Fotos sowie Serverfunktionen.
            Verarbeitete Daten: Dorf- und Hausdaten aus Abschnitt 2, Fotos, Installations-ID, Anfrageprotokolle, Inhalt von Meldungen.
            Speicherort: Region Seoul (ap-northeast-2). Zeitpunkt und Art der Übermittlung: Übertragung über das Internet bei jeder
            Nutzung des Dienstes. Speicherdauer: wie in Abschnitt 5. Kontakt:{" "}
            <Ext href="https://supabase.com/contact">supabase.com/contact</Ext> ·{" "}
            <Ext href="https://supabase.com/privacy">Datenschutzerklärung</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (USA) — Beauftragte Tätigkeit: Bestätigung von In-App-Käufen und Weitergabe der Kaufdaten.
            Verarbeitete Daten: Installations-ID, Transaktionsnummer, Produkt, Preis, Store. Zeitpunkt und Art der Übermittlung:
            Übertragung über das Internet beim Kauf in der App. Speicherdauer: gemäß den Richtlinien von RevenueCat. Kontakt:{" "}
            <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — Zahlungsabwicklung für In-App-Käufe (gemäß den Bedingungen und Datenschutzerklärungen des
            jeweiligen Stores).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (USA, weltweites Netzwerk) — Beauftragte Tätigkeit: Auslieferung und Sicherheit der Website
            (einschließlich der Ebene vor dem Supabase-Server). Verarbeitete Daten: Zugriffsdaten wie IP-Adresse und
            Browserinformationen. Zeitpunkt und Art der Übermittlung: Übertragung über das Internet bei jedem Aufruf der Website.
            Speicherdauer: gemäß den Richtlinien von Cloudflare. Kontakt: privacyquestions@cloudflare.com ·{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Datenschutzerklärung</Ext>
          </li>
        </ul>
        <p>
          Diese Daten sind für die Bereitstellung des Dienstes zwingend erforderlich. Wenn Sie die Übermittlung ins Ausland nicht
          möchten, können Sie den Dienst nicht nutzen oder Ihre Daten auf die in Abschnitt 5 beschriebene Weise löschen. Außer in
          gesetzlich vorgesehenen Fällen geben wir die Daten nicht an andere Dritte weiter, verkaufen sie nicht und nutzen sie nicht
          zu Werbezwecken.
        </p>
      </Section>

      <Section n={8} title="Wie wir die Daten schützen">
        <p>
          Die gesamte Kommunikation ist per HTTPS verschlüsselt. Fotos liegen in einem privaten Speicher ohne öffentliche Adresse und
          werden über eine nur 2 Minuten gültige Adresse angezeigt. Die Datenbank ist so abgeschirmt, dass sie nur über die Funktionen
          des Dienstes erreichbar ist, und geheime Verwaltungswerte werden nur als Hash gespeichert. Der Server prüft Eingabelängen
          sowie Format und Größe von Fotos erneut und begrenzt die Anzahl der Anfragen.
        </p>
      </Section>

      <Section n={9} title="Daten von Kindern">
        <p>
          Der Dienst richtet sich nicht an Kinder unter 14 Jahren und verarbeitet wissentlich keine Daten von Kindern unter 14
          Jahren. Wenn Sie erfahren, dass Daten eines Kindes unter 14 Jahren hochgeladen wurden, teilen Sie uns das bitte unter <Mail />{" "}
          mit. Nach Prüfung löschen wir sie.
        </p>
      </Section>

      <Section n={10} title="Rechte der Nutzer">
        <p>
          Sie können verlangen, Ihre Daten einzusehen, zu berichtigen oder zu löschen, und verlangen, dass ihre Verarbeitung
          eingestellt wird. Wenn Sie uns unter der oben genannten E-Mail-Adresse kontaktieren, bearbeiten wir Ihr Anliegen
          unverzüglich und teilen Ihnen das Ergebnis mit.
        </p>
      </Section>

      <Section n={11} title="Rechtsbehelfe">
        <p>
          Wenn Sie Beratung oder eine Streitbeilegung wegen einer Verletzung Ihrer personenbezogenen Daten benötigen, können Sie sich an
          die folgenden (koreanischen) Stellen wenden.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Schlichtungsausschuss für Streitigkeiten über personenbezogene Daten: 1833-6972 (www.kopico.go.kr)</li>
          <li>Meldezentrum für Datenschutzverletzungen: 118 (privacy.kisa.or.kr)</li>
          <li>Oberste Staatsanwaltschaft: 1301 (www.spo.go.kr)</li>
          <li>Nationale Polizeibehörde: 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Datenschutzbeauftragter und Änderungen">
        <p>
          Datenschutzbeauftragter: {OFFICER.name} · E-Mail: <Mail to={OFFICER.email} /> · Telefon: {OFFICER.phone}
        </p>
        <p>
          Fragen zum Dienst und Löschanfragen: <Mail to={CONTACT} />
        </p>
        <p>Wenn sich diese Erklärung ändert, veröffentlichen wir sie auf dieser Seite mit dem neuen Gültigkeitsdatum.</p>
      </Section>
    </>
  );
}
