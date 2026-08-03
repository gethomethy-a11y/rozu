import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Widerruf & Verkäufer — RŌZU', robots: { index: false } };

/* Wer verkauft, und was daraus folgt.
 *
 * Lemon Squeezy ist Merchant of Record: der Kaufvertrag kommt zwischen der
 * Kundin und Lemon Squeezy zustande, nicht mit uns. Eigene AGB und eine eigene
 * Widerrufsbelehrung zu schreiben, die uns als Verkäufer darstellen, wäre
 * schlicht falsch — und würde im Streitfall gegen uns ausgelegt. Diese Seite
 * sagt stattdessen klar, wer der Vertragspartner ist. */
export default function Widerruf() {
  return (
    <LegalPage title="Widerruf & Verkäufer" updated="August 2026">
      <h2>Wer verkauft</h2>
      <p>
        Der Kauf einer RŌZU-Routine wird über <b>Lemon Squeezy</b> abgewickelt. Lemon
        Squeezy ist dabei <b>Merchant of Record</b>, also der Verkäufer im rechtlichen
        Sinne. Der Kaufvertrag kommt zwischen dir und Lemon Squeezy zustande, nicht mit
        dem Betreiber dieser Seite.
      </p>
      <p>Daraus folgt konkret:</p>
      <ul>
        <li>Lemon Squeezy stellt die Rechnung aus und weist die Umsatzsteuer aus.</li>
        <li>Lemon Squeezy führt die Umsatzsteuer in deinem Land ab.</li>
        <li>
          Für Rückerstattungen, Zahlungsprobleme und Rückbuchungen ist Lemon Squeezy
          zuständig. Die Geschäftsbedingungen und die Rückgaberegelung findest du unter{' '}
          <a href="https://www.lemonsqueezy.com/terms" rel="noopener noreferrer" target="_blank">
            lemonsqueezy.com/terms
          </a>
          .
        </li>
        <li>Auf deinem Kontoauszug erscheint Lemon Squeezy, nicht RŌZU.</li>
      </ul>

      <h2>Widerrufsrecht bei digitalen Inhalten</h2>
      <p>
        Eine RŌZU-Routine ist ein digitaler Inhalt, der sofort nach dem Kauf
        bereitgestellt wird. Vor dem Kauf stimmst du im Checkout von Lemon Squeezy
        ausdrücklich zu, dass mit der Ausführung sofort begonnen wird, und bestätigst,
        dass du dadurch dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB).
      </p>
      <p>
        Die maßgebliche Widerrufsbelehrung ist die von Lemon Squeezy im Bestellvorgang
        angezeigte. Wenn du Fragen zu einer konkreten Bestellung hast, wende dich an
        Lemon Squeezy oder schreib uns — wir leiten es weiter.
      </p>

      <h2>Kontakt zu uns</h2>
      <p>
        Inhaltliche Fragen zur Routine beantworten wir gern:{' '}
        <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>. Vollständige
        Anbieterangaben im <a href="/impressum">Impressum</a>.
      </p>
    </LegalPage>
  );
}
