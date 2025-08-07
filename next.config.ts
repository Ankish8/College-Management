import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    // Disable ESLint during builds to avoid warnings blocking compilation
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enable TypeScript error checking to fix all type issues
    ignoreBuildErrors: false,
  },
  // Service Worker and PWA configuration
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
      ],
    },
  ],
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },
};

export default withBundleAnalyzer(nextConfig);
