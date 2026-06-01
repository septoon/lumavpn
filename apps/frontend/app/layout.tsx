import type { Metadata } from 'next';
import { Nav } from '../components/nav';
import { TwaProvider } from '../components/twa-provider';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'LumaVPN',
  description: 'VPN subscriptions with automatic provisioning after payment',
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/LumaVPN-logo.png`,
    shortcut: `${basePath}/LumaVPN-logo.png`,
    apple: `${basePath}/LumaVPN-logo.png`
  },
  appleWebApp: {
    capable: true,
    title: 'LumaVPN',
    statusBarStyle: 'default'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <TwaProvider>
          <Nav />
          {children}
        </TwaProvider>
      </body>
    </html>
  );
}
