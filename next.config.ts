import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TODO: fix TS errors en clientes-client.tsx y otros antes de activar strict mode
  typescript: { ignoreBuildErrors: true },
  turbopack: process.platform === "win32" ? {
    root: "d:\\Empresas\\KREO Studio\\Kostruye+\\kostruye-plus",
  } : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  headers: async () => [
    {
      source: "/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=2592000, stale-while-revalidate=86400",
        },
      ],
    },
    {
      source: "/(:path*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf))",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=2592000, stale-while-revalidate=86400",
        },
      ],
    },
    {
      source: "/",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default nextConfig;
