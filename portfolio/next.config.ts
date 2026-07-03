import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },

  reactStrictMode: true,

  compiler: {
    // Supprime les warnings d'hydratation non critiques en production
    reactRemoveProperties: process.env.NODE_ENV === "production",
  },

  // experimental: {
  //   Améliore la stabilité SSR/hydratation avec React 18+
  //   reactCompiler: true,
  // },
};

export default nextConfig;
