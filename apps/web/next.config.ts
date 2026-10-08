import path from "node:path";
import type { NextConfig } from "next";

const apiOrigin = process.env.INTERNAL_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Small self-contained server build, ideal for a 4 GB VPS.
  output: "standalone",
  // Monorepo: trace files from the repo root so @invitation/shared is included.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  poweredByHeader: false,
  // In development the browser talks to /api on this origin and Next forwards it
  // to the API. In production Caddy routes /api straight to the API container.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
