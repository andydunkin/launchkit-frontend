import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static site configuration
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'dist',
  
  // Optimize for static hosting
  images: {
    unoptimized: true
  },
  
  // API endpoint configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.launchkit.stratxi.com'
  },
  
  reactStrictMode: true,
};

export default nextConfig;
