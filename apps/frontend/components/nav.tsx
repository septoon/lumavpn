import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { TelegramProfile } from './telegram-profile';

const links = [
  ['Тарифы', '/plans'],
  ['FAQ', '/faq'],
  ['Подключение', '/connect'],
  ['Кабинет', '/account'],
  ['Контакты', '/contacts'],
  ['Админка', '/admin']
];

export function Nav() {
  return (
    <header className="site-header border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-6 w-6 shrink-0 text-cyan" />
            <span className="truncate">LumaVPN</span>
          </Link>
          <div className="md:hidden">
            <TelegramProfile />
          </div>
        </div>
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm text-muted md:mx-0 md:items-center md:gap-5 md:overflow-visible md:px-0 md:pb-0">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-md border border-line bg-white px-3 py-2 hover:text-ink md:border-0 md:px-0 md:py-0"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <TelegramProfile />
        </div>
      </div>
    </header>
  );
}
