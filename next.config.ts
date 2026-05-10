import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/photo/:path*",
        destination: "https://bucket.ryumy.com/photo/:path*",
      },
    ];
  },
};

export default nextConfig;
