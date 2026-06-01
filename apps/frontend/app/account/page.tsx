'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy } from 'lucide-react';
import { createPayment, getUserAccess, startTrial, type UserAccess } from '../../lib/api';
import { useTwa } from '../../components/twa-provider';

const planOptions = [
  ['MONTH_1', '1 месяц'],
  ['MONTH_3', '3 месяца'],
  ['MONTH_6', '6 месяцев']
] as const;

export default function AccountPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-10">Загрузка...</main>}>
      <AccountForm />
    </Suspense>
  );
}

function AccountForm() {
  const searchParams = useSearchParams();
  const { isTwa, isLoading, user, appUser, error } = useTwa();
  const [userId, setUserId] = useState('');
  const [planCode, setPlanCode] = useState(searchParams.get('plan') ?? 'MONTH_1');
  const [autoRenew, setAutoRenew] = useState(true);
  const [message, setMessage] = useState('');
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const telegramTitle = useMemo(() => {
    if (!user) return '';
    return user.username ? `@${user.username}` : user.firstName || `ID ${user.id}`;
  }, [user]);
  const deviceFingerprint = user?.id ? `telegram:${user.id}` : undefined;

  useEffect(() => {
    if (appUser?.id) setUserId(appUser.id);
  }, [appUser?.id]);

  useEffect(() => {
    if (!userId) return;
    void loadAccess(userId);
  }, [userId]);

  async function loadAccess(currentUserId = userId) {
    if (!currentUserId) return;
    setAccessLoading(true);
    try {
      setAccess(await getUserAccess(currentUserId, deviceFingerprint));
    } finally {
      setAccessLoading(false);
    }
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    const result = await createPayment({ userId, planCode, autoRenew });
    if (result.confirmationUrl) window.location.href = result.confirmationUrl;
    else setMessage(`Платёж создан: ${result.paymentId}`);
  }

  async function activateTrial() {
    if (!userId) return;
    setMessage('');
    await startTrial(userId, deviceFingerprint);
    setMessage('Пробный доступ активирован на 3 дня');
    await loadAccess(userId);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Личный кабинет</h1>
      <section className="mt-6 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={pay} className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Подписка</h2>
          {isTwa ? (
            <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
              <div className="font-medium text-ink">Telegram аккаунт</div>
              <div className="mt-1 text-muted">
                {isLoading ? 'Авторизация...' : telegramTitle || 'Аккаунт не определён'}
              </div>
              {error && <div className="mt-2 text-red-600">{error}</div>}
            </div>
          ) : (
            <>
              <label className="mt-4 block text-sm font-medium">User ID из Telegram-бота</label>
              <input
                className="mt-2 h-11 w-full rounded-md border border-line px-3"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                required
              />
            </>
          )}
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="font-medium text-ink">
              {accessLoading ? 'Проверяю доступ...' : access?.subscription ? 'Активная подписка' : 'Подписки нет'}
            </div>
            {access?.subscription && (
              <div className="mt-1 text-muted">
                {access.subscription.type === 'trial' ? 'Пробная' : 'Полная'} · {access.subscription.plan} · осталось{' '}
                {access.subscription.daysRemaining} дн. · до{' '}
                {new Date(access.subscription.expiresAt).toLocaleDateString('ru-RU')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={activateTrial}
            className="mt-4 h-11 w-full rounded-md border border-cyan bg-white text-sm font-semibold text-cyan disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!userId || Boolean(access?.subscription) || isLoading}
          >
            Получить пробный ключ на 3 дня
          </button>
          <label className="mt-4 block text-sm font-medium">Тариф</label>
          <select
            className="mt-2 h-11 w-full rounded-md border border-line px-3"
            value={planCode}
            onChange={(event) => setPlanCode(event.target.value)}
          >
            {planOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) => setAutoRenew(event.target.checked)}
            />
            Автопродление
          </label>
          <button
            className="mt-5 h-11 w-full rounded-md bg-cyan text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!userId || isLoading}
          >
            Оплатить
          </button>
          {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        </form>
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Ключи</h2>
            <button
              type="button"
              onClick={() => loadAccess()}
              className="h-9 rounded-md border border-line px-3 text-sm font-medium"
              disabled={!userId || accessLoading}
            >
              Обновить
            </button>
          </div>
          {!access?.configs.length && (
            <p className="mt-3 text-sm leading-6 text-muted">
              Активируйте пробный период или оплатите тариф, чтобы получить VLESS, MTProto и AmneziaWG.
            </p>
          )}
          <div className="mt-4 space-y-4">
            {access?.configs.map((config) => (
              <div key={config.id} className="rounded-md border border-line bg-slate-50 p-3 text-sm">
                <div className="font-semibold text-ink">{config.type}</div>
                {config.link && (
                  <div className="mt-2">
                    <div className="break-all text-muted">{config.link}</div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(config.link!)}
                      className="mt-2 inline-flex h-8 items-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-medium"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Скопировать
                    </button>
                  </div>
                )}
                {config.conf && (
                  <textarea
                    className="mt-2 h-32 w-full rounded-md border border-line bg-white p-2 font-mono text-xs"
                    readOnly
                    value={config.conf}
                  />
                )}
                {config.qrCode && <img src={config.qrCode} alt={`${config.type} QR`} className="mt-3 h-44 w-44" />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
