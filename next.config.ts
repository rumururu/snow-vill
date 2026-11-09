import type { NextConfig } from "next";

// Static export: every page is client-rendered against Supabase (anon RPC + Edge Function),
// so the site is plain files served from Cloudflare static assets (no server runtime).
// Village pages use /v/?id=… because dynamic path segments cannot be exported.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
