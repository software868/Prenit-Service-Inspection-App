import type { NextConfig } from "next";
// @ts-expect-error next-pwa types
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Avoid Windows file-lock issues on Desktop/OneDrive during dev
  distDir: process.env.NODE_ENV === "development" ? "node_modules/.cache/next-dev" : ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

const config =
  process.env.NODE_ENV === "production"
    ? withPWA({
        dest: "public",
        register: true,
        skipWaiting: true,
      })(nextConfig)
    : nextConfig;

export default config;
