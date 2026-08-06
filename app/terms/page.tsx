import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Seller & refunds — RŌZU', robots: { index: false } };

/* We do not publish our own terms of sale, because we are not the seller.
 * Lemon Squeezy is merchant of record, so the contract is between the customer
 * and Lemon Squeezy. Terms presenting us as the seller would be untrue and
 * would be read against us in a dispute. This page states the actual
 * arrangement instead. */
export default function Terms() {
  return (
    <LegalPage title="Seller & refunds" updated="August 2026">
      <h2>Who you are buying from</h2>
      <p>
        Payment for a RŌZU routine is handled by <b>Lemon Squeezy</b> as{' '}
        <b>merchant of record</b>. That means Lemon Squeezy is the seller in the legal
        sense: your contract is with them, not with the operator of this site.
      </p>
      <p>In practice:</p>
      <ul>
        <li>Lemon Squeezy issues your invoice and charges any applicable sales tax or VAT.</li>
        <li>Lemon Squeezy remits that tax in your country.</li>
        <li>
          Refunds, payment problems and chargebacks are handled by Lemon Squeezy under{' '}
          <a href="https://www.lemonsqueezy.com/terms" rel="noopener noreferrer" target="_blank">
            their terms
          </a>
          .
        </li>
        <li>Lemon Squeezy, not RŌZU, appears on your card statement.</li>
      </ul>

      <h2>What you are buying</h2>
      <p>
        A one-time purchase of a personalised skincare routine, generated after you
        answer the quiz and shown to you immediately in your browser. There is no
        subscription, nothing to install, and no physical product. Nothing recurs and
        nothing renews.
      </p>
      <p>
        Solo is $9 and covers one person. Couple is $12 and covers two. Prices are in
        US dollars; what you pay in your own currency depends on your card issuer.
      </p>

      <h2>Refunds</h2>
      <p>
        Because the routine is delivered the moment you pay, refunds are handled
        case by case by Lemon Squeezy under their policy. If something went wrong —
        the routine did not load, you were charged twice, you bought the wrong plan —
        email us at{' '}
        <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a> and we will help
        sort it out with them.
      </p>
      <p>
        If you are in the EU or the UK, you may have a statutory right of withdrawal
        for digital content. Lemon Squeezy handles that as the seller, and the terms
        shown to you at checkout are the ones that apply.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about a routine itself:{' '}
        <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>. Operator details
        on the <a href="/legal">Legal</a> page.
      </p>
    </LegalPage>
  );
}
