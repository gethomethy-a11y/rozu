import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of sale — RŌZU', robots: { index: false } };

/* These are real terms of sale, because we are now really the seller.
 *
 * Until August 2026 Lemon Squeezy was merchant of record and this page said so:
 * the contract was between the customer and Lemon Squeezy, and publishing terms
 * that presented us as the seller would have been untrue. Moving to Stripe
 * reversed that. Stripe is a payment processor, not a merchant of record, so
 * the seller is the operator named on /legal — and the tax, the refunds and the
 * chargebacks are theirs.
 *
 * Deliberately plain: the operator has to be able to stand behind every
 * sentence here, and a clause nobody can explain is worse than no clause. */
export default function Terms() {
  return (
    <LegalPage title="Terms of sale" updated="September 2026">
      <h2>Who you are buying from</h2>
      <p>
        You are buying from RŌZU, operated by the person and at the address shown on
        the <a href="/legal">Legal</a> page. Your contract is with us.
      </p>
      <p>
        Card payments are processed by <b>Stripe</b>. Stripe handles the card details
        and we never see them, but Stripe is our payment processor and not the seller —
        so questions, refunds and complaints come to us, not to them.
      </p>

      <h2>What you are buying</h2>
      <p>
        A one-time purchase of a personalised skincare routine, generated after you
        answer the quiz and shown to you immediately in your browser. There is no
        subscription, nothing to install, and no physical product. Nothing recurs and
        nothing renews.
      </p>
      <ul>
        <li><b>Solo</b> — $9, one person.</li>
        <li><b>Couple</b> — $12, two people plus a shared routine and a match score.</li>
        <li><b>Gift</b> — $9, one routine built for someone else.</li>
      </ul>
      <p>
        Prices are in US dollars. Any sales tax or VAT due in your country is
        calculated at checkout and shown to you before you pay; what the amount comes
        to in your own currency depends on your card issuer.
      </p>

      <h2>Delivery</h2>
      <p>
        Your routine appears as soon as the payment is confirmed, usually within a few
        seconds. We keep it for <b>45 days</b> so you can come back to it in the same
        browser. We do not keep accounts and we do not email it to you, so if you clear
        your browser data or switch device, write to us with the receipt and we will
        get it back to you.
      </p>

      <h2>Refunds</h2>
      <p>
        If the routine did not load, you were charged twice, or you bought the wrong
        plan, email{' '}
        <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a> and we will
        refund you. We would rather refund you than argue about it.
      </p>
      <p>
        Beyond that: the routine is generated for you and delivered the moment you pay,
        so we cannot take it back the way a shop takes back an unopened box. We look at
        those case by case and we are not difficult about it.
      </p>

      <h2>If you are in the EU or the UK</h2>
      <p>
        You normally have 14 days to withdraw from a distance contract. For digital
        content delivered immediately, that right ends once delivery has begun — but
        only if you asked for it to begin straight away and were told you would lose
        the right. Buying a routine is exactly that request, and this paragraph is that
        notice.
      </p>
      <p>
        If you would rather keep the 14 days, do not complete the purchase — email us
        instead and we will arrange it. And none of this affects your rights when
        something is actually faulty.
      </p>

      <h2>What the routine is not</h2>
      <p>
        A RŌZU routine is a set of general cosmetic suggestions. It is{' '}
        <b>not medical advice</b> and not a diagnosis. We do not promise it will treat,
        cure or prevent anything, and we do not earn commission on any product or
        brand. If you have a skin condition, a known allergy, or you are pregnant, talk
        to a doctor rather than to a quiz.
      </p>

      <h2>Contact</h2>
      <p>
        Anything at all: <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>.
        We aim to answer within 24 hours. Operator details are on the{' '}
        <a href="/legal">Legal</a> page.
      </p>
    </LegalPage>
  );
}
