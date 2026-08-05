import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Impressum — RŌZU', robots: { index: false } };

/* Angaben gemäß § 5 DDG (früher § 5 TMG).
 *
 * § 18 Abs. 2 MStV ist bewusst nicht aufgeführt: der verlangt einen
 * Verantwortlichen für journalistisch-redaktionelle Inhalte, und die gibt es
 * hier nicht. Eine Angabe zu machen, die auf das Angebot nicht zutrifft, ist
 * keine zusätzliche Sicherheit. */
export default function Impressum() {
  return (
    <LegalPage title="Impressum" updated="August 2026">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Lucia Mörner
        <br />
        663 Dansey Avenue
        <br />
        Coquitlam, BC V3K 3G2
        <br />
        Kanada
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>
      </p>
      <p>
        Anfragen per E-Mail werden in der Regel innerhalb von 24 Stunden beantwortet.
      </p>

      <h2>Umsatzsteuer</h2>
      <p>
        Kleinunternehmerin gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.
      </p>
      <p>
        Der Verkauf der RŌZU-Routinen selbst erfolgt über Lemon Squeezy als Merchant of
        Record. Lemon Squeezy stellt die Rechnung aus und führt die jeweils anfallende
        Umsatzsteuer ab. Näheres unter <a href="/widerruf">Widerruf &amp; Verkäufer</a>.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Hinweis zu den Inhalten</h2>
      <p>
        Die auf RŌZU erstellten Hautpflege-Routinen sind allgemeine kosmetische
        Empfehlungen und <b>keine medizinische Beratung</b>. Sie ersetzen keine Diagnose
        und keine Behandlung durch eine Ärztin oder einen Arzt. Bei Hauterkrankungen,
        anhaltenden Beschwerden, in der Schwangerschaft oder bei bekannten Allergien
        wende dich bitte an eine dermatologische Praxis.
      </p>
    </LegalPage>
  );
}
