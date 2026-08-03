import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE = process.env.ROZU_SITE_URL ?? 'https://rozu-homethy.vercel.app';
const DESCRIPTION =
  "Your melanin, barrier, and hormones are shaped by where you're from. RŌZU builds a skincare routine from that.";

/* Open Graph matters more than search here: the traffic arrives from a link
   pasted into TikTok, Instagram or a message, and that preview is the first
   thing anyone sees of the product. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'RŌZU — skincare built from your heritage',
  description: DESCRIPTION,
  openGraph: {
    title: 'RŌZU — skincare built from your heritage',
    description: DESCRIPTION,
    url: SITE,
    siteName: 'RŌZU',
    type: 'website',
    locale: 'en',
  },
  twitter: { card: 'summary_large_image', title: 'RŌZU', description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7a1d4a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
