'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Link2, LucideIcon, Send, Users, WalletCards } from 'lucide-react';
import {
  adminLogin,
  createSubscriptionGrant,
  disableUser,
  extendUser,
  getAdminDashboard,
  getAdminUsers,
  grantSubscription,
  type UserAccess
} from '../../lib/api';
import { useTwa } from '../../components/twa-provider';

const planOptions = [
  ['TRIAL_3', 'Пробный период'],
  ['MONTH_1', '1 месяц'],
  ['MONTH_3', '3 месяца'],
  ['MONTH_6', '6 месяцев']
] as const;
const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'lumastackvpn_bot';

type Dashboard = {
  stats: {
    users: number;
    activeSubscriptions: number;
    expiresToday: number;
    monthRevenue: number;
    totalRevenue: number;
  };
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    expiresAt: string;
    user: { telegramId: string | null; username: string | null };
  }>;
  payments: Array<{ id: string; amount: number; status: string; createdAt: string }>;
};

type AdminUser = {
  id: string;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  subscriptions?: Array<{ id: string; plan: string; status: string; expiresAt: string }>;
  vpnConfigs?: Array<{ id: string; type: string; isActive: boolean }>;
};

export default function AdminPage() {
  const { isTwa, isLoading, user, isAdmin, accessToken, error } = useTwa();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [authMessage, setAuthMessage] = useState('');
  const [identifierType, setIdentifierType] = useState<'telegramId' | 'userId'>('telegramId');
  const [identifier, setIdentifier] = useState('');
  const [planCode, setPlanCode] = useState('MONTH_1');
  const [autoRenew, setAutoRenew] = useState(false);
  const [linkPlanCode, setLinkPlanCode] = useState('MONTH_1');
  const [grantLink, setGrantLink] = useState<{
    link: string;
    planCode: string;
    expiresAt: string;
    qrCode?: string;
  } | null>(null);
  const [issuedAccess, setIssuedAccess] = useState<UserAccess | null>(null);
  const [manualMessage, setManualMessage] = useState('');
  const [linkMessage, setLinkMessage] = useState('');

  const stats = useMemo<Array<[string, string | number, LucideIcon]>>(
    () => [
      ['Пользователи', dashboard?.stats.users ?? 0, Users],
      ['Активные', dashboard?.stats.activeSubscriptions ?? 0, KeyRound],
      ['Истекают сегодня', dashboard?.stats.expiresToday ?? 0, WalletCards],
      ['Доход за месяц', `${dashboard?.stats.monthRevenue ?? 0} ₽`, WalletCards]
    ],
    [dashboard]
  );

  useEffect(() => {
    if (!accessToken || token) return;
    setAuthMessage('');
    setToken(accessToken);
    loadAdminData(accessToken)
      .catch(() => {
        setToken('');
        setAuthMessage('Не удалось загрузить админку по Telegram-сессии');
      });
  }, [accessToken, token]);

  async function loadAdminData(currentToken = token) {
    const [dashboardData, usersData] = await Promise.all([
      getAdminDashboard(currentToken),
      getAdminUsers(currentToken)
    ]);
    setDashboard(dashboardData);
    setAdminUsers(usersData);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setAuthMessage('');
    setManualMessage('');
    setLinkMessage('');
    const result = await adminLogin(email, password);
    setToken(result.accessToken);
    await loadAdminData(result.accessToken);
  }

  async function submitGrant(event: FormEvent) {
    event.preventDefault();
    setManualMessage('');
    const payload =
      identifierType === 'telegramId'
        ? { telegramId: identifier, planCode, autoRenew }
        : { userId: identifier, planCode, autoRenew };
    const result = await grantSubscription(token, payload) as { access?: UserAccess };
    setIssuedAccess(result.access ?? null);
    setManualMessage('Подписка выдана, конфигурации пересозданы');
    await loadAdminData(token);
  }

  async function submitGrantLink(event: FormEvent) {
    event.preventDefault();
    setLinkMessage('');
    const grant = await createSubscriptionGrant(token, { planCode: linkPlanCode, autoRenew: false });
    setGrantLink({
      planCode: grant.planCode,
      expiresAt: grant.expiresAt,
      qrCode: grant.qrCode,
      link: `https://t.me/${telegramBotUsername}?start=grant_${grant.token}`
    });
    setLinkMessage('Одноразовая ссылка для одного устройства создана');
  }

  if (!token) {
    if (isTwa && isLoading) {
      return (
        <main className="mx-auto max-w-md px-4 py-10">
          <h1 className="text-3xl font-semibold">Админка</h1>
          <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm text-sm text-muted">
            Авторизация через Telegram...
          </div>
        </main>
      );
    }

    if (isTwa && !isAdmin) {
      return (
        <main className="mx-auto max-w-md px-4 py-10">
          <h1 className="text-3xl font-semibold">Админка</h1>
          <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Недостаточно прав</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {user?.username ? `@${user.username}` : user?.firstName || 'Этот Telegram аккаунт'} не найден в
              TELEGRAM_ADMIN_IDS.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-semibold">Админка</h1>
        {authMessage && <p className="mt-4 text-sm text-red-600">{authMessage}</p>}
        <form onSubmit={login} className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-line px-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
          <label className="mt-4 block text-sm font-medium">Пароль</label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-line px-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
          <button className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink text-sm font-semibold text-white">
            Войти
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Админка</h1>
        <button
          onClick={async () => loadAdminData(token)}
          className="h-10 rounded-md border border-line bg-white px-4 text-sm font-medium"
        >
          Обновить
        </button>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-5">
            <Icon className="h-5 w-5 text-cyan" />
            <div className="mt-4 text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-sm text-muted">{label}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form onSubmit={submitGrantLink} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Одноразовая ссылка</h2>
            <label className="mt-4 block text-sm font-medium">Срок</label>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={linkPlanCode}
              onChange={(event) => setLinkPlanCode(event.target.value)}
            >
              {planOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan px-3 py-2 text-sm font-semibold text-white">
              <Link2 className="h-4 w-4" />
              Создать ссылку для одного устройства
            </button>
            {grantLink && (
              <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
                <div className="text-muted">
                  {grantLink.planCode} · до {new Date(grantLink.expiresAt).toLocaleString('ru-RU')}
                </div>
                <div className="mt-2 break-all font-medium">{grantLink.link}</div>
                {grantLink.qrCode && <img src={grantLink.qrCode} alt="Grant QR" className="mt-3 h-44 w-44" />}
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(grantLink.link)}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium"
                >
                  <Copy className="h-4 w-4" />
                  Скопировать
                </button>
              </div>
            )}
            {linkMessage && <p className="mt-4 text-sm text-cyan">{linkMessage}</p>}
          </form>

          <form onSubmit={submitGrant} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Выдать подписку вручную</h2>
            <div className="mt-5 grid grid-cols-2 rounded-md border border-line p-1 text-sm">
              {(['telegramId', 'userId'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIdentifierType(type)}
                  className={`h-9 rounded ${identifierType === type ? 'bg-ink text-white' : 'text-muted'}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium">Идентификатор пользователя</label>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
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
              Включить автопродление
            </label>
            <button className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan px-3 text-sm font-semibold text-white">
              <Send className="h-4 w-4" />
              Выдать подписку
            </button>
            {manualMessage && <p className="mt-4 text-sm text-cyan">{manualMessage}</p>}
            {issuedAccess?.configs.length ? (
              <div className="mt-4 space-y-3 rounded-md border border-line bg-slate-50 p-3 text-sm">
                <div className="font-semibold">Ключи пользователя</div>
                {issuedAccess.configs.map((config) => (
                  <div key={config.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <div className="font-medium">{config.type}</div>
                    {config.link && <div className="mt-1 break-all text-muted">{config.link}</div>}
                    {config.conf && (
                      <textarea
                        className="mt-2 h-28 w-full rounded-md border border-line bg-white p-2 font-mono text-xs"
                        readOnly
                        value={config.conf}
                      />
                    )}
                    {config.qrCode && <img src={config.qrCode} alt={`${config.type} QR`} className="mt-2 h-40 w-40" />}
                  </div>
                ))}
              </div>
            ) : null}
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Последние подписки</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[620px] w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="border-b border-line py-3">Пользователь</th>
                    <th className="border-b border-line py-3">Тариф</th>
                    <th className="border-b border-line py-3">Статус</th>
                    <th className="border-b border-line py-3">До</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.subscriptions ?? []).slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-line py-3">
                        {item.user.username || item.user.telegramId || 'user'}
                      </td>
                      <td className="border-b border-line py-3">{item.plan}</td>
                      <td className="border-b border-line py-3">{item.status}</td>
                      <td className="border-b border-line py-3">
                        {new Date(item.expiresAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Пользователи</h2>
            <div className="mt-4 space-y-3">
              {adminUsers.map((item) => {
                const active = (item.subscriptions ?? []).find((subscription) => subscription.status === 'ACTIVE');
                return (
                  <div key={item.id} className="rounded-md border border-line bg-slate-50 p-3 text-sm">
                    <div className="font-semibold">
                      {item.username ? `@${item.username}` : item.firstName || item.telegramId || item.id}
                    </div>
                    <div className="mt-1 text-muted">
                      {active
                        ? `${active.plan} · до ${new Date(active.expiresAt).toLocaleDateString('ru-RU')}`
                        : 'Нет активной подписки'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await extendUser(token, item.id, 30);
                          await loadAdminData(token);
                        }}
                        className="h-9 rounded-md border border-line bg-white px-3 text-xs font-medium"
                        disabled={!active}
                      >
                        +30 дней
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await disableUser(token, item.id);
                          await loadAdminData(token);
                        }}
                        className="h-9 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-600"
                        disabled={!active}
                      >
                        Отключить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
