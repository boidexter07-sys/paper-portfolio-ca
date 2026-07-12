/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    // T100-1: ship the seed DB inside the deploy artifact so the server bundle
    // resolves data/paperportfolio.db at runtime (Vercel functions ship only
    // traced files). Drift detection: data/paperportfolio.db.sha256.
    outputFileTracingIncludes: {
      '/': ['./data/paperportfolio.db'],
    },
  },
};

module.exports = nextConfig;
