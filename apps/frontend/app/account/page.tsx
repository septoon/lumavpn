'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPayment } from '../../lib/api';

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
  const [userId, setUserId] = useState('');
  const [planCode, setPlanCode] = useState(searchParams.get('plan') ?? 'MONTH_1');
  const [autoRenew, setAutoRenew] = useState(true);
  const [message, setMessage] = useState('');

  async function pay(event: FormEvent) {
    event.preventDefault();
    const result = await createPayment({ userId, planCode, autoRenew });
    if (result.confirmationUrl) window.location.href = result.confirmationUrl;
    else setMessage(`Платёж создан: ${result.paymentId}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Личный кабинет</h1>
      <section className="mt-6 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={pay} className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Оплата подписки</h2>
          <label className="mt-4 block text-sm font-medium">User ID из Telegram-бота</label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-line px-3"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            required
          />
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
          <button className="mt-5 h-11 w-full rounded-md bg-cyan text-sm font-semibold text-white">
            Оплатить
          </button>
          {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        </form>
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Доступ</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            После успешной оплаты конфиги выдаются автоматически: VLESS и MTProto как ссылки,
            AmneziaWG как QR-код и файл `.conf`.
          </p>
        </div>
      </section>
    </main>
  );
}
