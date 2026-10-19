import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
