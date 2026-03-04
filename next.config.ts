import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Acknowledge Turbopack is being used (required in Next.js 16)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
