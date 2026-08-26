import type { NextConfig } from "next";

const localApiUrl = process.env.LOCAL_API_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    if (!localApiUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: localApiUrl + "/api/:path*"
      }
    ];
  }
};

export default nextConfig;
