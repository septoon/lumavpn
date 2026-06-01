const items = [
  ['Когда приходит доступ?', 'Сразу после успешного webhook от YooKassa.'],
  ['Что будет после окончания подписки?', 'Cron-задача отключит VLESS UUID, AmneziaWG peer и MTProto доступ.'],
  ['Можно ли включить автопродление?', 'Да, после первого платежа сохраняется payment_method_id.']
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">FAQ</h1>
      <div className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
        {items.map(([q, a]) => (
          <section key={q} className="p-5">
            <h2 className="font-medium">{q}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{a}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
