import type { MetadataRoute } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LumaVPN',
    short_name: 'LumaVPN',
    description: 'VPN subscriptions with automatic provisioning after payment',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#f7fafc',
    theme_color: '#4bacc4',
    icons: [
      {
        src: `${basePath}/LumaVPN-logo.png`,
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${basePath}/LumaVPN-logo.png`,
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
