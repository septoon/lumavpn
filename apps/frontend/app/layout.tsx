import type { Metadata } from 'next';
import { Nav } from '../components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'LumaVPN',
  description: 'VPN subscriptions with automatic provisioning after payment'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
