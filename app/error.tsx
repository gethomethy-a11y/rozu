'use client';

import { useEffect } from 'react';

/* The last line of defence. Without this file a render error anywhere in the
 * quiz shows Next's own error page — a black screen reading "Application error:
 * a client-side exception has occurred", with no way back.
 *
 * The important case is a customer who has already paid: the routine is cached
 * server-side against their sid, so reloading really does bring it back. Saying
 * so is the difference between a refund request and a refresh. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[render]', error);
  }, [error]);

  return (
    <main className="legal">
      <h1 className="legal-h">Something went wrong</h1>
      <p>
        This is our fault, not yours. If you have already paid, nothing is lost — your
        routine is saved and reloading this page brings it back.
      </p>
      <p>
        <button className="cta" onClick={reset} style={{ maxWidth: 320 }}>
          Try again
        </button>
      </p>
      <p>
        Still stuck? Email <a href="mailto:gethomethy@gmail.com">gethomethy@gmail.com</a>
        {error.digest ? <> and quote <code>{error.digest}</code></> : null} and we will sort
        it out.
      </p>
    </main>
  );
}
