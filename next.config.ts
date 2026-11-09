import type { NextConfig } from "next";

// M0 prototype: all village data is mocked client-side, so Cache Components /
// partial prefetching are intentionally not enabled.
const nextConfig: NextConfig = {
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
