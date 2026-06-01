export default function ConnectPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Подключение</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {['VLESS Reality', 'MTProto Proxy', 'AmneziaWG'].map((title) => (
          <section key={title} className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              После оплаты конфигурация появится в кабинете и будет отправлена Telegram-ботом.
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
