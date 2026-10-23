/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load these with Node's require() at runtime instead of bundling them.
  serverExternalPackages: ["mysql2", "bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.mojen.ai" },
      { protocol: "https", hostname: "static.cdn.mojen.ai" },
    ],
  },
};

export default nextConfig;
