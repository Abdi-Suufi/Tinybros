import type { NextConfig } from "next";

// Check if we are building for the App (Capacitor)
const isApp = process.env.BUILD_TARGET === 'app';

const nextConfig: NextConfig = {
  // 1. Only use static export for the App
  output: isApp ? "export" : undefined,
  
  images: {
    // 2. Disable image optimization for the App (phones handle it)
    unoptimized: isApp,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;