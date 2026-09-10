'use client';

/* Only runs when the root layout itself fails, which is why it has to render
 * its own <html> and <body> — at this point nothing else has. Styles are
 * inline for the same reason: globals.css is loaded by the layout that just
 * failed. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f5f6',
          color: '#111',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>RŌZU could not load</h1>
          <p style={{ color: '#6c5f65', lineHeight: 1.6, marginBottom: 20 }}>
            If you have already paid, nothing is lost — your routine is saved and
            reloading brings it back.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#7a1d4a',
              color: '#fff',
              border: 'none',
              borderRadius: 15,
              padding: '15px 28px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
