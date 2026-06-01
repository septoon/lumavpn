import Link from 'next/link';
import { ArrowRight, Bot, CreditCard, KeyRound } from 'lucide-react';
import { getPlans } from '../lib/api';
import { PlanCard } from '../components/plan-card';
import { MiniAppDashboard } from '../components/mini-app-dashboard';

export default async function HomePage() {
  const plans = await getPlans();

  return (
    <main>
      <MiniAppDashboard />
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-14">
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl md:text-6xl">
              LumaVPN для стабильного доступа через VLESS, AmneziaWG и MTProto
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Оплата через YooKassa, автоматическая выдача конфигураций, продление подписки и отключение доступа без ручной рутины.
            </p>
            <Link
              href="/plans"
              className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-cyan px-5 text-sm font-semibold text-white hover:bg-[#008fac] sm:w-auto"
            >
              Выбрать тариф <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-lg border border-line bg-[#f8fcfd] p-4 shadow-sm sm:p-5">
            <div className="grid gap-3">
              {[
                ['Оплата', 'YooKassa, webhook, автопродление', CreditCard],
                ['Выдача', 'VLESS link, MTProto link, AmneziaWG QR', KeyRound],
                ['Telegram', 'Покупка и получение доступа в боте', Bot]
              ].map(([title, text, Icon]) => (
                <div key={title as string} className="flex items-start gap-3 rounded-md border border-line bg-white p-4 sm:items-center sm:gap-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan sm:mt-0 sm:h-6 sm:w-6" />
                  <div>
                    <div className="font-medium">{title as string}</div>
                    <div className="text-sm text-muted">{text as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Тарифы</h2>
          <Link href="/faq" className="text-sm text-cyan">FAQ</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => <PlanCard key={plan.code} plan={plan} />)}
        </div>
      </section>
    </main>
  );
}
