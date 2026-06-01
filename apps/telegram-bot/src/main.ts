import axios from 'axios';
import * as QRCode from 'qrcode';
import { Context, Markup, Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://backend:3001/api';
const supportUrl = process.env.TELEGRAM_SUPPORT_URL ?? 'https://t.me/support';
const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'lumastackvpn_bot';
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

const menu = Markup.keyboard([
  ['💳 Купить подписку', '📅 Моя подписка'],
  ['📲 Получить подключение', '🔄 Продлить'],
  ['⚙️ Автопродление', '🆘 Поддержка']
]).resize();

const adminMenu = Markup.keyboard([
  ['💳 Купить подписку', '📅 Моя подписка'],
  ['📲 Получить подключение', '🔄 Продлить'],
  ['👑 Выдать подписку', '⚙️ Автопродление'],
  ['🆘 Поддержка']
]).resize();

const grantPlans = [
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
      const message = error instanceof Error ? error.message : 'unknown error';
      await ctx.reply(`Не удалось подключить подписку: ${message}`, isAdmin(ctx) ? adminMenu : menu);
    }
    return;
  }

  await syncUser(ctx);
  await ctx.reply('LumaVPN: выберите действие.', isAdmin(ctx) ? adminMenu : menu);
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  await ctx.reply('Выберите срок подписки для одноразовой ссылки/QR.', grantPlanKeyboard());
});

bot.command('grant', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  return ctx.reply('Выберите срок подписки для одноразовой ссылки/QR.', grantPlanKeyboard());
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
  const { data } = await axios.get(`${apiUrl}/telegram/users/${user.id}/configs`, {
    params: { deviceFingerprint: deviceFingerprint(ctx) }
  });
  if (!data.length) return ctx.reply('Активные конфигурации не найдены.', menu);

  for (const item of data as Array<{ type: string; config: string; qrCode?: string }>) {
    const parsed = JSON.parse(item.config);
    if (item.type === 'VLESS') await ctx.reply(parsed.link);
    if (item.type === 'MTPROXY') await ctx.reply(parsed.link);
    if (item.type === 'AMNEZIA') {
      await ctx.replyWithDocument({ source: Buffer.from(parsed.conf), filename: 'amneziawg.conf' });
      if (item.qrCode) await ctx.reply(item.qrCode);
    }
  }
});

bot.hears('🔄 Продлить', (ctx) => ctx.reply('Для продления выберите тариф через покупку подписки.', menu));
bot.hears('⚙️ Автопродление', (ctx) => ctx.reply('Автопродление включается при оплате с сохранением метода платежа.', menu));
bot.hears('🆘 Поддержка', (ctx) => ctx.reply(`Поддержка: ${supportUrl}`, menu));
bot.hears('👑 Выдать подписку', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Недостаточно прав.');
  return ctx.reply('Выберите срок подписки для одноразовой ссылки/QR.', grantPlanKeyboard());
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
