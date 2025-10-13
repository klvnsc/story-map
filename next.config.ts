import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move skipTrailingSlashRedirect out of experimental (Next.js 15+ change)
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
