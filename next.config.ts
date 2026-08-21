import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB is too small for uploaded slide PDFs/images and lesson videos.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
