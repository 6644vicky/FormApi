/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Frame/CORS headers now live in middleware.ts, scoped per-route instead
  // of applied to every page — see the comment there for why.
};

module.exports = nextConfig;
