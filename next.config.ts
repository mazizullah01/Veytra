import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote images are served unoptimized-by-third-party but optimized by Next.
    // Only hosts declared here may be used with next/image.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Keep the generated HTML lean and predictable across devices.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
