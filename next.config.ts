import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TODO: fix TS errors en clientes-client.tsx y otros antes de activar strict mode
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
