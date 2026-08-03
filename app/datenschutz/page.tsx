import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Datenschutzerklärung — RŌZU', robots: { index: false } };

/* Beschreibt, was die App tatsächlich tut — nicht was eine Vorlage vermutet.
 *
 * Jeder Absatz hier entspricht echtem Code: die Quizantworten gehen an
 * /api/checkout und liegen in Upstash, die Herkunft und der Hauttyp gehen an
 * Anthropic, die Zahlung läuft über Lemon Squeezy, die Pixel feuern erst nach
 * Einwilligung. Eine Datenschutzerklärung, die etwas anderes behauptet als der
 * Code tut, ist das eigentliche Risiko. */
export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="August 2026">
      <div className="legal-todo">
        <b>Vor dem Launch ausfüllen.</b> Die eckigen Klammern ersetzen. Prüfe außerdem,
        ob du bei Upstash und Anthropic einen Auftragsverarbeitungsvertrag abschließen
        musst — beide bieten das an.
      </div>

      <h2>1. Verantwortlicher</h2>
      <p>
        [VORNAME NACHNAME], [STRASSE], [PLZ ORT], Deutschland. E-Mail:
        [DEINE E-MAIL-ADRESSE]. Weitere Angaben im <a href="/impressum">Impressum</a>.
      </p>

      <h2>2. Was wir erheben, und warum</h2>

      <h3>a) Deine Quizantworten</h3>
      <p>
        Wenn du das Quiz ausfüllst, bleiben deine Antworten zunächst nur in deinem
        Browser. Erst wenn du auf „Unlock my routine" tippst, werden sie an unseren
        Server übertragen und dort gespeichert, damit deine Routine nach der Zahlung
        erstellt werden kann.
      </p>
      <p>
        Gespeichert werden: Herkunft, Hauttyp, Hautton, ausgewählte Hautprobleme,
        Geschlecht, Angaben zu Schlaf, Stress und Ernährung sowie dein bisheriges
        Pflege-Level. Ein Name, eine Adresse oder ein Geburtsdatum werden nicht
        abgefragt.
      </p>
      <p>
        <b>Besondere Kategorien:</b> Angaben zu Herkunft und Gesundheit gelten nach
        Art. 9 DSGVO als besonders schützenswert. Wir verarbeiten sie ausschließlich auf
        Grundlage deiner ausdrücklichen Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO,
        die du mit dem Absenden des Kaufs erteilst, und nur zu dem einen Zweck, deine
        Routine zu erstellen.
      </p>
      <p>Speicherdauer: 45 Tage, danach automatische Löschung.</p>

      <h3>b) Erstellung der Routine (Anthropic)</h3>
      <p>
        Zur Erstellung der Routine übermitteln wir deine Antworten an Anthropic PBC,
        548 Market St, San Francisco, USA. Übertragen werden ausschließlich die oben
        genannten Angaben — keine IP-Adresse, keine E-Mail-Adresse, keine
        Zahlungsdaten, nichts, was dich identifiziert. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. b DSGVO (Vertragserfüllung). Anthropic verwendet Eingaben über die API
        nicht zum Training seiner Modelle.
      </p>

      <h3>c) Zahlung (Lemon Squeezy)</h3>
      <p>
        Die Zahlung wickelt Lemon Squeezy als Merchant of Record ab. Deine
        Zahlungsdaten und deine E-Mail-Adresse gibst du direkt dort ein; wir sehen und
        speichern sie nicht. Es gilt die{' '}
        <a href="https://www.lemonsqueezy.com/privacy" rel="noopener noreferrer" target="_blank">
          Datenschutzerklärung von Lemon Squeezy
        </a>
        . Siehe auch <a href="/widerruf">Widerruf &amp; Verkäufer</a>.
      </p>

      <h3>d) Speicherung (Upstash)</h3>
      <p>
        Bestellungen und erstellte Routinen liegen bei Upstash Inc. in der Region
        Frankfurt, also innerhalb der EU. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h3>e) Hosting (Vercel)</h3>
      <p>
        Die Seite wird von Vercel Inc. ausgeliefert. Dabei fallen technisch notwendige
        Server-Logs an, unter anderem deine gekürzte IP-Adresse, Zeitpunkt und
        Browsertyp. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb).
      </p>

      <h3>f) Reichweitenmessung — nur mit deiner Einwilligung</h3>
      <p>
        Wenn du im Banner zustimmst, laden wir den TikTok Pixel (TikTok Technology
        Limited, Irland) und das LinkedIn Insight Tag (LinkedIn Ireland Unlimited
        Company). Damit messen wir, welche Inhalte zu Käufen führen. Rechtsgrundlage:
        Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG.
      </p>
      <p>
        <b>Ohne deine Zustimmung wird nichts davon geladen</b> — keine Skripte, keine
        Cookies, keine Verbindung zu TikTok oder LinkedIn. Du kannst deine Einwilligung
        jederzeit widerrufen, indem du unten auf dieser Seite die
        Cookie-Einstellungen erneut öffnest.
      </p>
      <p>
        Beide Anbieter können Daten in die USA übermitteln. Grundlage dafür sind die
        Standardvertragsklauseln der EU-Kommission.
      </p>

      <h2>3. Was wir nicht tun</h2>
      <ul>
        <li>Wir verkaufen keine Daten.</li>
        <li>Wir versenden keine Werbe-E-Mails.</li>
        <li>Wir legen kein Kundenkonto an.</li>
        <li>Wir setzen keine Cookies, solange du nicht zustimmst.</li>
      </ul>

      <h2>4. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung
        (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und
        Widerspruch (Art. 21). Eine einmal erteilte Einwilligung kannst du jederzeit mit
        Wirkung für die Zukunft widerrufen.
      </p>
      <p>
        Schreib dafür an [DEINE E-MAIL-ADRESSE]. Da wir keine Kundenkonten führen, nenne
        bitte die Bestellnummer aus deiner Lemon-Squeezy-Rechnung, damit wir deine Daten
        zuordnen können.
      </p>
      <p>
        Du kannst dich außerdem bei einer Aufsichtsbehörde beschweren, zuständig ist die
        Datenschutzbehörde deines Bundeslandes.
      </p>
    </LegalPage>
  );
}
