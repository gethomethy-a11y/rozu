/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /* The legal pages used to live at German paths, from when the operator was
     in Munich. Anything already pointing at them — a saved link, a payment
     provider's review — should still land somewhere rather than on a 404. */
  async redirects() {
    return [
      { source: '/impressum', destination: '/legal', permanent: true },
      { source: '/datenschutz', destination: '/privacy', permanent: true },
      { source: '/widerruf', destination: '/terms', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
