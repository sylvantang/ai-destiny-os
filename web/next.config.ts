import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from the parent project's compiled dist
  serverExternalPackages: [],
  // Ensure the parent dist is treated as external (not re-bundled)
  // by excluding it from webpack processing
  webpack: (config) => {
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      // Exclude parent project's native module from bundling
      'better-sqlite3',
    ];
    return config;
  },
};

export default nextConfig;
