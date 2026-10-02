import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image; Vercel packages the app itself.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["pg-boss", "postgres", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
