import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};
export default nextConfig;
