import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phaser accesses browser globals and must never be bundled server-side
  serverExternalPackages: ["phaser"],
};

export default nextConfig;
