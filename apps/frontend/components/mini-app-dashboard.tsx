'use client';

import Link from 'next/link';
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getUserAccess, type UserAccess } from '../lib/api';
import { useTwa } from './twa-provider';

function formatPlan(plan: string) {
  if (plan === 'TRIAL_3') return 'Пробный период';
  if (plan === 'MONTH_1') return '1 месяц';
  if (plan === 'MONTH_3') return '3 месяца';
  if (plan === 'MONTH_6') return '6 месяцев';
  return plan;
}

export function MiniAppDashboard() {
  const { isTwa, isLoading, user, appUser, isAdmin, error } = useTwa();
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState('');
  const deviceFingerprint = user?.id ? `telegram:${user.id}` : undefined;
  const displayName = useMemo(() => {
    if (!user) return 'Telegram';
    return user.firstName || user.username || `ID ${user.id}`;
  }, [user]);

  useEffect(() => {
    if (!appUser?.id) return;
    getUserAccess(appUser.id, deviceFingerprint)
      .then((result) => {
        setAccess(result);
        setAccessError('');
      })
      .catch(() => setAccessError('Не удалось загрузить подписки'));
  }, [appUser?.id, deviceFingerprint]);

  if (!isTwa) return null;

  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="rounded-lg border border-line bg-[#f8fcfd] p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-cyan ring-1 ring-line">
                <UserRound className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{isLoading ? 'Авторизация...' : displayName}</div>
              <div className="truncate text-sm text-muted">
                {user?.username ? `@${user.username}` : appUser?.telegramId ? `Telegram ID ${appUser.telegramId}` : 'Telegram Mini App'}
              </div>
            </div>
            {isAdmin && (
              <div className="ml-auto hidden shrink-0 items-center gap-2 rounded-md border border-cyan/30 bg-white px-3 py-2 text-sm font-medium text-cyan sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </div>
            )}
          </div>

          {(error || accessError) && <p className="mt-3 text-sm text-red-600">{error || accessError}</p>}

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
            <div className="min-w-0 rounded-md border border-line bg-white p-3">
              <div className="text-sm font-semibold">Подписки</div>
              {!access && <div className="mt-2 text-sm text-muted">Загрузка...</div>}
              {access && access.subscriptions.length === 0 && (
                <div className="mt-2 text-sm text-muted">Подписок пока нет</div>
              )}
              <div className="mt-2 space-y-2">
                {access?.subscriptions.map((subscription) => (
                  <div key={subscription.id} className="min-w-0 rounded-md bg-slate-50 p-3 text-sm">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium">{formatPlan(subscription.plan)}</span>
                      <span className="rounded bg-white px-2 py-0.5 text-xs text-muted">
                        {subscription.type === 'trial' ? 'Пробная' : 'Полная'}
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 text-xs text-muted">{subscription.status}</span>
                    </div>
                    <div className="mt-1 text-muted">
                      Осталось {subscription.daysRemaining} дн. · до{' '}
                      {new Date(subscription.expiresAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:w-64 md:grid-cols-1">
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-cyan px-3 py-2 text-sm font-semibold text-white"
              >
                <KeyRound className="h-4 w-4" />
                Ключи и QR
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white"
                >
                  Админка
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
