import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Docker image ships only .next/standalone (see Dockerfile); the tracing root keeps the repo-root lockfile out.
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Task attachments up to 10 MB go through a server action and the auth proxy (src/proxy.ts).
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
