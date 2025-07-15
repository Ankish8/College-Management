import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    // Disable ESLint during builds to avoid warnings blocking compilation
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enable TypeScript error checking to fix all type issues
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
