import { PlanCard } from '../../components/plan-card';
import { getPlans } from '../../lib/api';

export default async function PlansPage() {
  const plans = await getPlans();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Тарифы</h1>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => <PlanCard key={plan.code} plan={plan} />)}
      </div>
    </main>
  );
}
