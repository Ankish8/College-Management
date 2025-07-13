import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true
  },
  // Enable React strict mode for better performance in dev
  reactStrictMode: true,
  // Optimize for smaller bundle sizes
  compress: true,
  // Enable experimental features for better performance
  experimental: {
    // Enable optimized CSS loading
    optimizeCss: true,
    // Better tree shaking
    optimizePackageImports: ['@tanstack/react-query']
  }
};

export default nextConfig;
