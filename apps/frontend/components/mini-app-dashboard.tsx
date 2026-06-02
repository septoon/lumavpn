'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CircleHelp,
  Copy,
  Gauge,
  KeyRound,
  Link2,
  MessageCircle,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getUserAccess, type UserAccess } from '../lib/api';
import { useTwa } from './twa-provider';

const deviceLimit = 5;

function formatPlan(plan: string) {
  if (plan === 'TRIAL_3') return 'Пробный период';
  if (plan === 'MONTH_1') return '1 месяц';
  if (plan === 'MONTH_3') return '3 месяца';
  if (plan === 'MONTH_6') return '6 месяцев';
  return plan;
}

function formatDate(value?: string) {
  if (!value) return 'нет активной подписки';
  return new Date(value).toLocaleDateString('ru-RU');
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'L';
}

function SubscriptionPanel({ access }: { access: UserAccess | null }) {
  const subscription = access?.subscription;
  const days = Math.max(subscription?.daysRemaining ?? 0, 0);
  const planDays = subscription?.plan === 'TRIAL_3' ? 3 : subscription?.plan === 'MONTH_3' ? 90 : subscription?.plan === 'MONTH_6' ? 180 : 30;
  const progress = subscription ? Math.max(8, Math.min(100, Math.round((days / planDays) * 100))) : 0;

  return (
    <section className="twa-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-twa-muted">
            <ShieldCheck className="h-4 w-4 text-lime" />
            {subscription ? 'Подписка активна' : 'Подписки нет'}
          </div>
          <h2 className="mt-3 text-4xl font-bold leading-none text-white">
            {subscription ? `${days} дн.` : '0 дн.'}
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-twa-muted">
            <CalendarClock className="h-4 w-4" />
            до {formatDate(subscription?.expiresAt)}
          </div>
        </div>
        <div className="grid h-24 w-24 place-items-center rounded-full border border-lime/35 bg-lime/10 text-center shadow-[0_0_30px_rgba(220,255,37,0.18)]">
          <Gauge className="h-9 w-9 text-lime" />
          <span className="text-[11px] font-semibold text-lime">без лимита</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-white">{subscription ? `Осталось ${days} дней` : 'Нужно активировать доступ'}</span>
          <span className="font-semibold text-lime">{subscription ? `${progress}%` : '0%'}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime shadow-[0_0_18px_rgba(220,255,37,0.55)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-twa-muted">
            <MonitorSmartphone className="h-4 w-4" />
            Лимит устройств
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{deviceLimit} устройств</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-twa-muted">
            <RefreshCw className="h-4 w-4" />
            Тариф
          </div>
          <div className="mt-1 truncate text-lg font-semibold text-white">{subscription ? formatPlan(subscription.plan) : 'не выбран'}</div>
        </div>
      </div>
    </section>
  );
}

function AdminQuickActions() {
  return (
    <section className="twa-panel border-l-2 border-lime p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-lime" />
        <h2 className="text-lg font-semibold text-lime">Админ</h2>
        <span className="text-sm text-twa-muted">режим управления</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['Дашборд', '/admin', Activity],
          ['Пользователи', '/admin', UsersRound],
          ['Выдать', '/admin', Link2]
        ].map(([label, href, Icon]) => (
          <Link key={label as string} href={href as string} className="twa-ghost-button min-h-16 flex-col gap-1 px-2 text-xs">
            <Icon className="h-5 w-5" />
            <span className="text-center">{label as string}</span>
          </Link>
        ))}
      </div>
    </section>
  );
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
  const connectedDevices = Math.min(access?.configs.length ?? 0, deviceLimit);

  useEffect(() => {
    if (!appUser?.id) return;
    getUserAccess(appUser.id, deviceFingerprint)
      .then((result) => {
        setAccess(result);
        setAccessError('');
      })
      .catch(() => setAccessError('Не удалось загрузить доступ'));
  }, [appUser?.id, deviceFingerprint]);

  if (!isTwa) return null;

  return (
    <section className="twa-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
        <header className="flex items-center justify-between gap-3 pt-2">
          <div>
            <div className="text-sm uppercase text-twa-muted">LumaVPN</div>
            <h1 className="text-2xl font-bold text-white">Мини-приложение</h1>
          </div>
          <button
            type="button"
            onClick={() => user?.id && navigator.clipboard.writeText(user.id)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white"
          >
            <Copy className="h-4 w-4 text-lime" />
            ID
          </button>
        </header>

        <section className="flex items-center gap-4 py-2">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-lime/80" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-3xl font-bold text-white shadow-[0_16px_38px_rgba(18,28,49,0.55)]">
              {getInitials(displayName)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-3xl font-bold leading-tight text-white">{isLoading ? 'Авторизация...' : displayName}</div>
            <div className="mt-1 truncate text-base text-twa-muted">
              {user?.username ? `@${user.username}` : appUser?.telegramId ? `id:${appUser.telegramId}` : 'Telegram'}
            </div>
          </div>
          {isAdmin && (
            <span className="ml-auto shrink-0 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-sm font-semibold text-lime">
              admin
            </span>
          )}
        </section>

        {(error || accessError) && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error || accessError}</div>}

        <SubscriptionPanel access={access} />

        <section className="grid grid-cols-2 gap-3">
          <div className="twa-panel p-4">
            <div className="flex items-center gap-2 text-sm text-twa-muted">
              <Activity className="h-5 w-5 text-lime" />
              Трафик
            </div>
            <div className="mt-5 text-3xl font-bold text-lime">∞</div>
            <div className="text-sm text-twa-muted">без ограничений</div>
          </div>
          <div className="twa-panel p-4">
            <div className="flex items-center gap-2 text-sm text-twa-muted">
              <Smartphone className="h-5 w-5 text-lime" />
              Устройства
            </div>
            <div className="mt-5 text-3xl font-bold text-white">{connectedDevices} / {deviceLimit}</div>
            <div className="text-sm text-twa-muted">активных</div>
          </div>
        </section>

        <Link href="/connect" className="twa-primary-button mt-1 min-h-20 text-xl">
          <Zap className="h-6 w-6 fill-current" />
          Подключить устройство
          <ArrowRight className="ml-auto h-6 w-6" />
        </Link>

        <section className="grid grid-cols-3 gap-2">
          {[
            ['Продлить', '/account?plan=MONTH_1', RefreshCw],
            ['Профиль', '/account', KeyRound],
            ['Поддержка', '/contacts', MessageCircle]
          ].map(([label, href, Icon]) => (
            <Link key={label as string} href={href as string} className="twa-ghost-button min-h-16 flex-col gap-1 text-sm">
              <Icon className="h-5 w-5" />
              <span>{label as string}</span>
            </Link>
          ))}
        </section>

        {isAdmin && <AdminQuickActions />}

        <section className="twa-panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Как подключиться</h2>
            <Link href="/faq" className="inline-flex items-center gap-1 text-sm font-semibold text-lime">
              <CircleHelp className="h-4 w-4" />
              FAQ
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-twa-muted">
            {['Тип устройства', 'Приложение', 'Импорт'].map((label, index) => (
              <div key={label} className="min-w-0">
                <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full border ${index === 0 ? 'border-lime bg-lime text-black' : 'border-white/15 bg-white/8 text-white'}`}>
                  {index + 1}
                </div>
                <div className="mt-2">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['Shadowrocket', 'VLESS'],
              ['AmneziaWG', 'WG'],
              ['MTProto', 'резерв']
            ].map(([title, text]) => (
              <Link key={title} href="/connect" className="rounded-2xl border border-white/10 bg-white/6 p-3 text-left">
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs text-twa-muted">{text}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
