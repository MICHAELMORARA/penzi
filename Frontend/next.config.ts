import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployment-friendly configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true, // Add this for better Vercel compatibility
  },
  devIndicators: false,
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    esmExternals: false
  }
};

export default nextConfig;