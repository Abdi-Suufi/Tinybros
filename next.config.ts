import path from "path";
import type { NextConfig } from "next";

// Check if we are building for the App (Capacitor)
const isApp = process.env.BUILD_TARGET === 'app';

const nextConfig: NextConfig = {
  // 1. Only use static export for the App
  output: isApp ? "export" : undefined,
  
  images: {
    // 2. Disable image optimization (TMDB provides pre-optimized images)
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        pathname: '/originals/**',
      },
      {
        protocol: 'https',
        hostname: 'static2.klipy.com',
        pathname: '/ii/**',
      },
    ],
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Pin the project root: a stray lockfile in the home folder otherwise makes Next guess the wrong one
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;