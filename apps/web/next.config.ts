import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // 60 for guest-site photos (AVIF holds up well and keeps every image far under 150 KB), 75 elsewhere.
    qualities: [60, 75],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'http', hostname: 'localhost', port: '4000' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.staydirect.lk' },
    ],
  },
};

export default nextConfig;
