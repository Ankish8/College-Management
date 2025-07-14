import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Essential settings only
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  // Remove problematic experimental features for now
  experimental: {
    optimizeCss: true
  }
};

export default nextConfig;
