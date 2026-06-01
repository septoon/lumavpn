'use client';

import { ShieldCheck, UserRound } from 'lucide-react';
import { useTwa } from './twa-provider';

export function TelegramProfile() {
  const { isTwa, isLoading, user, isAdmin } = useTwa();
  if (!isTwa) return null;

  const title = user?.username ? `@${user.username}` : user?.firstName || 'Telegram';

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm text-muted md:max-w-56">
      {isAdmin ? <ShieldCheck className="h-4 w-4 shrink-0 text-cyan" /> : <UserRound className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 truncate">{isLoading ? 'Telegram...' : title}</span>
    </div>
  );
}
