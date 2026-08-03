import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Impressum — RŌZU', robots: { index: false } };

/* Angaben gemäß § 5 DDG (früher § 5 TMG).
 *
 * Die Platzhalter MÜSSEN durch echte Daten ersetzt werden, bevor die Seite live
 * geht. Ein Impressum mit Platzhaltern ist schlechter als keines: es ist
 * nachweisbar falsch. Ich trage hier nichts ein, was ich nicht sicher weiß. */
export default function Impressum() {
  return (
    <LegalPage title="Impressum" updated="August 2026">
      <div className="legal-todo">
        <b>Vor dem Launch ausfüllen.</b> Alles in eckigen Klammern muss durch deine
        echten Daten ersetzt werden. Eine ladungsfähige Anschrift ist Pflicht — ein
        Postfach genügt nicht.
      </div>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        [VORNAME NACHNAME]
        <br />
        [STRASSE UND HAUSNUMMER]
        <br />
        [PLZ] [ORT]
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: [DEINE E-MAIL-ADRESSE]
        <br />
        Telefon: [DEINE TELEFONNUMMER]
      </p>

      <h2>Umsatzsteuer</h2>
      <p>
        [Wenn du eine USt-IdNr. hast: „Umsatzsteuer-Identifikationsnummer gemäß § 27 a
        UStG: DE………". Wenn nicht, stattdessen: „Kleinunternehmer gemäß § 19 UStG, es
        wird keine Umsatzsteuer ausgewiesen." Der Verkauf selbst läuft über Lemon
        Squeezy als Merchant of Record — siehe <a href="/widerruf">Widerruf &amp;
        Verkäufer</a>.]
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        [VORNAME NACHNAME], Anschrift wie oben.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Die auf RŌZU erstellten Hautpflege-Routinen sind allgemeine kosmetische
        Empfehlungen und <b>keine medizinische Beratung</b>. Sie ersetzen keine
        Diagnose und keine Behandlung durch eine Ärztin oder einen Arzt. Bei
        Hauterkrankungen, anhaltenden Beschwerden, Schwangerschaft oder bekannten
        Allergien wende dich bitte an eine dermatologische Praxis.
      </p>
    </LegalPage>
  );
}
