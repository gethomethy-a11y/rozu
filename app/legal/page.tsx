import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Legal — RŌZU', robots: { index: false } };

/* Canada has no equivalent of a German Impressum, so this page exists for a
 * different reason: Stripe's review, the ad platforms, and anyone who
 * wants to know who is behind the site. That makes "who we are and how to
 * reach us" the whole job — no statutory recitals that do not apply here. */
export default function Legal() {
  return (
    <LegalPage title="Legal" updated="August 2026">
      <h2>Who operates RŌZU</h2>
      <p>
        Lucia Mörner
        <br />
        663 Dansey Avenue
        <br />
        Coquitlam, BC V3K 3G2
        <br />
        Canada
      </p>
      <p>
        RŌZU is operated as a sole proprietorship. It is not incorporated.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>
      </p>
      <p>We aim to answer within 24 hours.</p>

      <h2>Who sells the routines</h2>
      <p>
        RŌZU, operated by the person named above, is the seller. Card payments are
        processed by Stripe on our behalf; Stripe is our payment processor, not the
        seller, so your contract is with us. Details on{' '}
        <a href="/terms">Terms of sale</a>.
      </p>

      <h2>This is not medical advice</h2>
      <p>
        The routines RŌZU produces are general cosmetic suggestions. They are{' '}
        <b>not medical advice</b>, not a diagnosis, and not a substitute for seeing a
        physician or a dermatologist. If you have a skin condition, a persistent
        problem, a known allergy, or you are pregnant, talk to a doctor rather than to
        a quiz.
      </p>
      <p>
        We do not claim that any routine will treat, cure or prevent anything, and we
        do not sell, recommend or earn commission on any specific product or brand.
      </p>
    </LegalPage>
  );
}
