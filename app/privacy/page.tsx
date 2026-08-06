import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy — RŌZU', robots: { index: false } };

/* Written against what the code actually does, not what a template assumes.
 *
 * Two regimes apply at once and the policy says so, because moving to Canada
 * does not move the visitors: the operator is in British Columbia, so PIPEDA
 * and BC's PIPA govern how they handle personal information — but the app is in
 * English and will be opened from the EU, and the GDPR follows the visitor, not
 * the seller. Dropping the GDPR half because the address changed would be a
 * quiet downgrade for exactly the people it protects. */
export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <p>
        Short version: your quiz answers go to one place to build your routine, they are
        deleted after 45 days, and nothing is tracked unless you say yes. We do not sell
        data, we do not email you, and we do not create an account for you.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        Lucia Mörner, 663 Dansey Avenue, Coquitlam, BC V3K 3G2, Canada. Email:{' '}
        <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>. More on the{' '}
        <a href="/legal">Legal</a> page.
      </p>
      <p>
        We handle personal information under Canada&apos;s <b>PIPEDA</b> and British
        Columbia&apos;s <b>Personal Information Protection Act</b>. If you are in the
        EU, the EEA or the UK, the <b>GDPR</b> also applies to you — see section 6.
      </p>

      <h2>2. Your quiz answers</h2>
      <p>
        While you are answering the quiz, your answers stay in your browser. They are
        only sent to our server when you tap &ldquo;Unlock my routine&rdquo;, so that
        your routine can be built after payment.
      </p>
      <p>
        What we store: heritage, skin type, skin tone, the concerns you selected,
        gender, your sleep, stress and diet answers, and your current routine level. We
        never ask for your name, your address or your date of birth.
      </p>
      <p>
        Heritage and skin concerns say something about your background and your health.
        We treat them as sensitive, we use them for one purpose only — building your
        routine — and we do not use them for anything else, ever.
      </p>
      <p>
        <b>Kept for 45 days, then deleted automatically.</b>
      </p>

      <h2>3. Building the routine (Anthropic)</h2>
      <p>
        To generate your routine we send your answers to Anthropic PBC, 548 Market St,
        San Francisco, USA. Only the answers listed above are sent — no IP address, no
        email address, no payment details, nothing that identifies you. Anthropic does
        not use API inputs to train its models.
      </p>

      <h2>4. Payment (Lemon Squeezy)</h2>
      <p>
        Payment is handled by Lemon Squeezy as merchant of record. You enter your card
        details and your email address with them directly; we never see or store either.
        Their{' '}
        <a href="https://www.lemonsqueezy.com/privacy" rel="noopener noreferrer" target="_blank">
          privacy policy
        </a>{' '}
        applies to that part. See also <a href="/terms">Seller &amp; refunds</a>.
      </p>

      <h2>5. Storage and hosting</h2>
      <p>
        Orders and generated routines are stored with Upstash Inc. in their Frankfurt
        region. The site itself is served by Vercel Inc., which keeps standard server
        logs — a shortened IP address, a timestamp and a browser type — for security and
        reliability.
      </p>

      <h2>6. Measurement — only if you agree</h2>
      <p>
        If you accept the banner, we load the TikTok Pixel (TikTok Technology Limited,
        Ireland) and the LinkedIn Insight Tag (LinkedIn Ireland Unlimited Company) so we
        can see which posts lead to a routine.
      </p>
      <p>
        <b>If you decline, none of it loads</b> — no scripts, no cookies, no connection
        to TikTok or LinkedIn at all. You can change your mind at any time by clearing
        this site&apos;s data in your browser, which brings the banner back.
      </p>
      <p>
        Both companies may transfer data to the United States. Where the GDPR applies,
        that transfer relies on the European Commission&apos;s standard contractual
        clauses.
      </p>

      <h2>7. What we never do</h2>
      <ul>
        <li>We do not sell your data.</li>
        <li>We do not send marketing email.</li>
        <li>We do not create an account for you.</li>
        <li>We set no cookies until you accept the banner.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>
        Under PIPEDA and BC PIPA you can ask what personal information we hold about
        you, ask for it to be corrected, and complain to the Office of the Privacy
        Commissioner of Canada or to the Office of the Information and Privacy
        Commissioner for British Columbia.
      </p>
      <p>
        If you are in the EU, the EEA or the UK, you additionally have the rights to
        access, rectification, erasure, restriction, portability and objection under the
        GDPR, and you can complain to your national supervisory authority. Where we rely
        on your consent — the pixels, and the sensitive answers described in section 2 —
        you can withdraw it at any time with effect for the future.
      </p>
      <p>
        Write to <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>. Because
        we do not keep customer accounts, please include the order number from your
        Lemon Squeezy receipt so we can find your data.
      </p>
    </LegalPage>
  );
}
