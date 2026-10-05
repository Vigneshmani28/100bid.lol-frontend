import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["172.31.1.84"],
  // Produces a self-contained .next/standalone build (a minimal server.js +
  // only the node_modules it actually needs) — this is what the production
  // Dockerfile copies into the runtime image instead of the full repo.
  output: "standalone",
};

export default nextConfig;
