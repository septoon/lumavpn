import Link from 'next/link';
import type { PublicPlan } from '@lumavpn/shared';
import { Check } from 'lucide-react';

export function PlanCard({ plan }: { plan: PublicPlan }) {
  return (
    <article className="flex min-h-72 flex-col rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{plan.title}</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{plan.description}</p>
        </div>
        <div className="min-w-16 whitespace-nowrap rounded-md bg-cyan/10 px-3 py-2 text-center text-sm font-semibold text-cyan">
          {plan.durationDays} дн.
        </div>
      </div>
      <div className="mt-6 text-3xl font-semibold">{plan.priceRub} ₽</div>
      <ul className="mt-5 space-y-3 text-sm text-muted">
        {plan.vpnTypes.map((type) => (
          <li key={type} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-cyan" />
            {type === 'VLESS' ? 'VLESS Reality' : type === 'AMNEZIA' ? 'AmneziaWG' : 'MTProto Proxy'}
          </li>
        ))}
      </ul>
      <Link
        href={`/account?plan=${plan.code}`}
        className="mt-auto inline-flex h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black"
      >
        Купить
      </Link>
    </article>
  );
}
