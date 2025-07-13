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
  },
  // Development specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Disable caching in development
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
    // Enable fast refresh
    webpack: (config: any) => {
      config.cache = false
      return config
    }
  })
};

export default nextConfig;
