import Link from 'next/link';
import type { ReactNode } from 'react';

/* Shared shell for the legal pages.
 *
 * Plain server components with no client JavaScript: these have to render for a
 * regulator, a payment provider's review team and an ad platform's crawler,
 * none of which are running the app. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        RŌZU
      </Link>
      <h1 className="legal-h">{title}</h1>
      <p className="legal-date">Stand: {updated}</p>
      {children}
      <div className="legal-nav">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/widerruf">Widerruf &amp; Verkäufer</Link>
        <Link href="/">Zurück zu RŌZU</Link>
      </div>
    </main>
  );
}
