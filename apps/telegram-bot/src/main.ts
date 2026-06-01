import axios from 'axios';
import { execFile } from 'node:child_process';
import * as net from 'node:net';
import * as os from 'node:os';
import { promisify } from 'node:util';
import * as QRCode from 'qrcode';
import { Context, Markup, Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://backend:3001/api';
const supportUrl = process.env.TELEGRAM_SUPPORT_URL ?? 'https://t.me/support';
const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'lumastackvpn_bot';
const reportTimeZone = process.env.TELEGRAM_REPORT_TIMEZONE ?? process.env.TZ ?? 'Europe/Simferopol';
const reportHour = Number(process.env.TELEGRAM_REPORT_HOUR ?? 8);
const reportMinute = Number(process.env.TELEGRAM_REPORT_MINUTE ?? 0);
const tcpCheckTimeoutMs = Number(process.env.TELEGRAM_REPORT_TCP_TIMEOUT_MS ?? 3000);
const adminIds = new Set(
  (process.env.TELEGRAM_ADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Telegraf(token);
const execFileAsync = promisify(execFile);

const menu = Markup.keyboard([
  ['🎁 Пробный доступ', '💳 Купить подписку'],
  ['📅 Моя подписка'],
  ['📲 Получить подключение', '🔄 Продлить'],
  ['⚙️ Автопродление', '🆘 Поддержка']
]).resize();

const adminMenu = Markup.keyboard([
  ['🎁 Пробный доступ', '💳 Купить подписку'],
  ['📅 Моя подписка'],
  ['📲 Получить подключение', '🔄 Продлить'],
  ['👑 Выдать подписку', '📊 Отчет'],
  ['⚙️ Автопродление'],
  ['🆘 Поддержка']
]).resize();

const grantPlans = [
  { code: 'TRIAL_3', title: 'Пробный период' },
  { code: 'MONTH_1', title: '1 месяц' },
  { code: 'MONTH_3', title: '3 месяца' },
  { code: 'MONTH_6', title: '6 месяцев' }
] as const;

function grantPlanKeyboard() {
  return Markup.inlineKeyboard(
    grantPlans.map((plan) => [
      Markup.button.callback(plan.title, `admin_grant:${plan.code}`)
    ])
  );
}

function adminActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Отчет по серверу/VPN', 'admin_report')],
    ...grantPlans.map((plan) => [
      Markup.button.callback(`Выдать ${plan.title}`, `admin_grant:${plan.code}`)
    ])
  ]);
}

async function syncUser(ctx: Context) {
  const from = ctx.from;
  if (!from) throw new Error('Telegram user not found');
  const response = await axios.post(`${apiUrl}/telegram/users`, {
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name
  });
  return response.data as { id: string };
}

function isAdmin(ctx: Context) {
  return Boolean(ctx.from?.id && adminIds.has(String(ctx.from.id)));
}

function deviceFingerprint(ctx: Context) {
  return ctx.from?.id ? `telegram:${ctx.from.id}` : undefined;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === 'object' && error.response.data && 'message' in error.response.data
        ? String(error.response.data.message)
        : undefined;
    return responseMessage ?? error.message;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

async function getAdminToken() {
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for bot admin actions');
  }

  const response = await axios.post(`${apiUrl}/auth/admin/login`, {
    email: adminEmail,
    password: adminPassword
  });
  return response.data.accessToken as string;
}

async function createGrantLink(input: { planCode: string; createdByTelegramId: string }) {
  const accessToken = await getAdminToken();
  const response = await axios.post(
    `${apiUrl}/admin/subscription-grants`,
    {
      planCode: input.planCode,
      autoRenew: false,
      createdByTelegramId: input.createdByTelegramId
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const grant = response.data as { token: string; planCode: string; expiresAt: string };
  return {
    ...grant,
    link: `https://t.me/${botUsername}?start=grant_${grant.token}`
  };
}

type DashboardReport = {
  stats?: {
    users?: number;
    activeSubscriptions?: number;
    expiresToday?: number;
    monthRevenue?: number;
    totalRevenue?: number;
    activeVpnConfigs?: number;
    activeVpnConfigsByType?: Record<string, number>;
  };
};

type TcpCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

async function getDiskUsage() {
  try {
    const { stdout } = await execFileAsync('df', ['-h', '/']);
    const [, line] = stdout.trim().split('\n');
    const parts = line?.split(/\s+/) ?? [];
    if (parts.length >= 5) {
      return `${parts[2]}/${parts[1]} (${parts[4]})`;
    }
  } catch {
    return 'недоступно';
  }
  return 'недоступно';
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}д ${hours}ч ${minutes}м`;
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} ГБ`;
}

function parseHostPort(value?: string, fallbackPort?: string | number) {
  if (!value) return undefined;
  const normalized = value.includes('://') ? value : `tcp://${value}`;
  try {
    const url = new URL(normalized);
    return {
      host: url.hostname,
      port: Number(url.port || fallbackPort)
    };
  } catch {
    const [host, port] = value.split(':');
    return { host, port: Number(port || fallbackPort) };
  }
}

function tcpCheck(name: string, host?: string, port?: string | number): Promise<TcpCheck> {
  const numericPort = Number(port);
  if (!host || !Number.isFinite(numericPort) || numericPort <= 0) {
    return Promise.resolve({ name, ok: false, detail: 'не настроен' });
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: numericPort, timeout: tcpCheckTimeoutMs });
    let settled = false;

    const finish = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ name, ok, detail });
    };

    socket.once('connect', () => finish(true, `${host}:${numericPort}`));
    socket.once('timeout', () => finish(false, `timeout ${host}:${numericPort}`));
    socket.once('error', (error) => finish(false, `${host}:${numericPort} ${error.message}`));
  });
}

async function getBackendHealthLine() {
  try {
    const { data } = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    return `Backend: OK (${data.service ?? 'backend'})`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return `Backend: FAIL (${message})`;
  }
}

async function getDashboardReport() {
  if (!adminEmail || !adminPassword) return undefined;
  const accessToken = await getAdminToken();
  const { data } = await axios.get<DashboardReport>(`${apiUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10000
  });
  return data;
}

async function buildAdminReport() {
  const now = new Date();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const disk = await getDiskUsage();
  const backendHealthLine = await getBackendHealthLine();
  const amneziaEndpoint = parseHostPort(process.env.AMNEZIA_ENDPOINT);

  const checks = await Promise.all([
    tcpCheck(
      'VLESS',
      process.env.XRAY_PUBLIC_HOST,
      process.env.XRAY_PUBLIC_PORT ?? '443'
    ),
    tcpCheck('Xray API', process.env.XRAY_API_HOST, process.env.XRAY_API_PORT),
    tcpCheck('MTProto proxy', process.env.MTPROTO_HOST, process.env.MTPROTO_PORT ?? '443')
  ]);

  let dashboard: DashboardReport | undefined;
  let dashboardError: string | undefined;
  try {
    dashboard = await getDashboardReport();
  } catch (error) {
    dashboardError = error instanceof Error ? error.message : 'unknown error';
  }

  const stats = dashboard?.stats;
  const vpnByType = stats?.activeVpnConfigsByType ?? {};
  const vpnSummary = ['VLESS', 'AMNEZIA', 'MTPROXY']
    .map((type) => `${type}: ${vpnByType[type] ?? 0}`)
    .join(', ');

  const lines = [
    `Отчет LumaVPN за ${now.toLocaleString('ru-RU', { timeZone: reportTimeZone })}`,
    '',
    'Сервер:',
    `Host: ${os.hostname()} (${os.platform()} ${os.release()} ${os.arch()})`,
    `Uptime: ${formatUptime(os.uptime())}`,
    `Load avg: ${os.loadavg().map((value) => value.toFixed(2)).join(' / ')}`,
    `RAM: ${formatBytes(usedMem)}/${formatBytes(totalMem)}`,
    `Disk /: ${disk}`,
    '',
    'Backend/API:',
    backendHealthLine,
    stats
      ? `Users: ${stats.users ?? 0}, active subscriptions: ${stats.activeSubscriptions ?? 0}, expires today: ${stats.expiresToday ?? 0}`
      : `Admin stats: недоступны${dashboardError ? ` (${dashboardError})` : ''}`,
    stats
      ? `Revenue: month ${stats.monthRevenue ?? 0} ₽, total ${stats.totalRevenue ?? 0} ₽`
      : undefined,
    '',
    'VPN/proxy:',
    ...checks.map((check) => `${check.name}: ${check.ok ? 'OK' : 'FAIL'} (${check.detail})`),
    `AmneziaWG: ${
      amneziaEndpoint
        ? `endpoint ${amneziaEndpoint.host}:${amneziaEndpoint.port || 'unknown'}, interface ${process.env.AMNEZIA_INTERFACE ?? 'не задан'}`
        : 'endpoint не настроен'
    }`,
    stats ? `Active VPN configs: ${stats.activeVpnConfigs ?? 0} (${vpnSummary})` : undefined
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

async function sendAdminReport(chatId: string | number) {
  const report = await buildAdminReport();
  await bot.telegram.sendMessage(chatId, report, adminMenu);
}

async function sendDailyReports() {
  if (!adminIds.size) return;
  const report = await buildAdminReport();
  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendMessage(adminId, report, adminMenu);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`Daily admin report failed for ${adminId}: ${message}`);
    }
  }
}

async function sendUserConfigs(ctx: Context, userId: string) {
  const { data } = await axios.get(`${apiUrl}/telegram/users/${userId}/configs`, {
    params: { deviceFingerprint: deviceFingerprint(ctx) }
  });
  if (!data.length) {
    await ctx.reply('Активные конфигурации не найдены.', isAdmin(ctx) ? adminMenu : menu);
    return;
  }

  for (const item of data as Array<{ type: string; config: string; qrCode?: string }>) {
    const parsed = JSON.parse(item.config);
    if (item.type === 'VLESS') await ctx.reply(parsed.link);
    if (item.type === 'MTPROXY') await ctx.reply(parsed.link);
    if (item.type === 'AMNEZIA') {
      await ctx.replyWithDocument({ source: Buffer.from(parsed.conf), filename: 'amneziawg.conf' });
      if (item.qrCode) await ctx.reply(item.qrCode);
    }
  }
}

async function sendTrialExpiryWarnings() {
  if (!adminEmail || !adminPassword) return;
  try {
    const accessToken = await getAdminToken();
    const { data } = await axios.get<
      Array<{ id: string; expiresAt: string; user: { telegramId: string | null } }>
    >(`${apiUrl}/admin/trials/warnings-due`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000
    });

    for (const item of data) {
      if (!item.user.telegramId) continue;
      await bot.telegram.sendMessage(
        item.user.telegramId,
        `Пробный доступ LumaVPN истекает через 1 день.\nАктивен до: ${new Date(item.expiresAt).toLocaleString('ru-RU')}\n\nЧтобы не потерять доступ, продлите подписку.`,
        menu
      );
      await axios.post(
        `${apiUrl}/admin/trials/${item.id}/warning-sent`,
        { telegramId: item.user.telegramId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
  } catch (error) {
    console.error(`Trial expiry warning failed: ${errorMessage(error)}`);
  }
}

function startTrialWarningScheduler() {
  void sendTrialExpiryWarnings();
  setInterval(() => void sendTrialExpiryWarnings(), 60 * 60 * 1000);
}

function getZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: reportTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';
  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
    minute: Number(value('minute'))
  };
}

function startDailyReportScheduler() {
  if (!adminIds.size) return;
  let lastReportDateKey: string | undefined;

  const tick = () => {
    const parts = getZonedParts(new Date());
    if (
      parts.hour === reportHour &&
      parts.minute === reportMinute &&
      lastReportDateKey !== parts.dateKey
    ) {
      lastReportDateKey = parts.dateKey;
      void sendDailyReports();
    }
  };

  tick();
  setInterval(tick, 30_000);
}

bot.start(async (ctx) => {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const payload = text.split(/\s+/)[1];
  if (payload?.startsWith('grant_')) {
    const token = payload.slice('grant_'.length);
    const from = ctx.from;
    if (!from) return ctx.reply('Не удалось определить Telegram-пользователя.');

    try {
      const { data } = await axios.post(`${apiUrl}/telegram/users/grants/${token}/claim`, {
        telegramId: String(from.id),
        username: from.username,
        firstName: from.first_name,
        deviceFingerprint: deviceFingerprint(ctx)
      });
      await ctx.reply(
        `Подписка подключена к одному устройству.\nТариф: ${data.subscription.plan}\nАктивна до: ${new Date(data.subscription.expiresAt).toLocaleString('ru-RU')}`,
        isAdmin(ctx) ? adminMenu : menu
      );
    } catch (error) {
      await ctx.reply(`Не удалось подключить подписку: ${errorMessage(error)}`, isAdmin(ctx) ? adminMenu : menu);
    }
    return;
  }

  await syncUser(ctx);
  await ctx.reply('LumaVPN: выберите действие.', isAdmin(ctx) ? adminMenu : menu);
});

bot.hears('🎁 Пробный доступ', async (ctx) => {
  const user = await syncUser(ctx);
  try {
    const { data } = await axios.post(`${apiUrl}/telegram/users/${user.id}/trial`, {
      deviceFingerprint: deviceFingerprint(ctx)
    });
    await ctx.reply(
      `Пробный доступ активирован на 3 дня.\nАктивен до: ${new Date(data.expiresAt).toLocaleString('ru-RU')}`,
      isAdmin(ctx) ? adminMenu : menu
    );
    await sendUserConfigs(ctx, user.id);
  } catch (error) {
    await ctx.reply(`Не удалось активировать пробный доступ: ${errorMessage(error)}`, isAdmin(ctx) ? adminMenu : menu);
  }
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  await ctx.reply('Админ-действия.', adminActionsKeyboard());
});

bot.command('grant', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  return ctx.reply('Выберите срок подписки для одноразовой ссылки/QR.', grantPlanKeyboard());
});

bot.command('report', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  await sendAdminReport(ctx.chat.id);
});

bot.action('admin_report', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Недостаточно прав.');
    return;
  }
  await ctx.answerCbQuery('Готовлю отчет');
  await sendAdminReport(ctx.chat!.id);
});

bot.action(/^admin_grant:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Недостаточно прав.');
    return;
  }

  try {
    const [, planCode] = ctx.match;
    const grant = await createGrantLink({
      planCode,
      createdByTelegramId: String(ctx.from.id)
    });
    const qr = await QRCode.toBuffer(grant.link, { width: 512, margin: 1 });
    await ctx.replyWithPhoto(
      { source: qr },
      {
        caption:
          `Одноразовая ссылка/QR для одного устройства.\nТариф: ${grant.planCode}\nДействует до: ${new Date(grant.expiresAt).toLocaleString('ru-RU')}\n\n${grant.link}`,
        ...adminMenu
      }
    );
    await ctx.answerCbQuery('Ссылка создана');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await ctx.reply(`Не удалось создать ссылку/QR: ${message}`, adminMenu);
    await ctx.answerCbQuery('Ошибка');
  }
});

bot.hears('💳 Купить подписку', async (ctx) => {
  const user = await syncUser(ctx);
  const { data: plans } = await axios.get(`${apiUrl}/plans`);
  await ctx.reply(
    'Выберите тариф:',
    Markup.inlineKeyboard(
      plans.map((plan: { code: string; title: string; priceRub: number }) => [
        Markup.button.callback(`${plan.title} · ${plan.priceRub} ₽`, `buy:${user.id}:${plan.code}`)
      ])
    )
  );
});

bot.action(/^buy:(.+):(.+)$/, async (ctx) => {
  const [, userId, planCode] = ctx.match;
  const { data } = await axios.post(`${apiUrl}/payments`, { userId, planCode, autoRenew: true });
  await ctx.reply(`Оплата: ${data.confirmationUrl}`);
  await ctx.answerCbQuery();
});

bot.hears('📅 Моя подписка', async (ctx) => {
  const user = await syncUser(ctx);
  const { data } = await axios.get(`${apiUrl}/subscriptions/user/${user.id}`);
  if (!data) return ctx.reply('Активной подписки нет.', menu);
  return ctx.reply(`Тариф: ${data.plan}\nАктивна до: ${new Date(data.expiresAt).toLocaleString('ru-RU')}`, menu);
});

bot.hears('📲 Получить подключение', async (ctx) => {
  const user = await syncUser(ctx);
  await sendUserConfigs(ctx, user.id);
});

bot.hears('🔄 Продлить', (ctx) => ctx.reply('Для продления выберите тариф через покупку подписки.', menu));
bot.hears('⚙️ Автопродление', (ctx) => ctx.reply('Автопродление включается при оплате с сохранением метода платежа.', menu));
bot.hears('🆘 Поддержка', (ctx) => ctx.reply(`Поддержка: ${supportUrl}`, menu));
bot.hears('👑 Выдать подписку', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  return ctx.reply('Выберите срок подписки для одноразовой ссылки/QR.', grantPlanKeyboard());
});
bot.hears('📊 Отчет', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  await sendAdminReport(ctx.chat.id);
});

bot.launch();
startDailyReportScheduler();
startTrialWarningScheduler();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
