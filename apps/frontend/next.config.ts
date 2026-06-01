import type { NextConfig } from 'next';

const output = process.env.NEXT_OUTPUT === 'export' ? 'export' : 'standalone';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output,
  basePath,
  assetPrefix: basePath,
  trailingSlash: output === 'export',
  images: {
    unoptimized: output === 'export'
  },
  transpilePackages: ['@lumavpn/shared']
};

export default nextConfig;
