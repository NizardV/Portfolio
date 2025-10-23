import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
