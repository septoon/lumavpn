import { defaultPlans, type PublicPlan } from '@lumavpn/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const fallbackPlans: PublicPlan[] = defaultPlans.map((plan) => ({
  code: plan.code,
  title: plan.title,
  description: plan.description ?? null,
  priceRub: plan.priceRub,
  durationDays: plan.durationDays,
  vpnTypes: plan.vpnTypes
}));

export async function getPlans(): Promise<PublicPlan[]> {
  try {
    const response = await fetch(`${apiUrl}/plans`);
    if (!response.ok) return fallbackPlans;
    return response.json();
  } catch {
    return fallbackPlans;
  }
}

export async function createPayment(input: { userId: string; planCode: string; autoRenew: boolean }) {
  const response = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Payment creation failed');
  return response.json() as Promise<{ paymentId: string; confirmationUrl?: string }>;
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${apiUrl}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Invalid credentials');
  return response.json() as Promise<{ accessToken: string }>;
}

export type TelegramWebAppAuthResult = {
  user: {
    id: string;
    telegramId: string | null;
    username: string | null;
    firstName: string | null;
  };
  telegramUser: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
  };
  isAdmin: boolean;
  accessToken?: string;
};

export async function loginTelegramWebApp(initData: string) {
  const response = await fetch(`${apiUrl}/auth/telegram/webapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  if (!response.ok) throw new Error('Telegram WebApp auth failed');
  return response.json() as Promise<TelegramWebAppAuthResult>;
}

export async function getAdminDashboard(token: string) {
  const response = await fetch(`${apiUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Admin API failed');
  return response.json();
}

export async function grantSubscription(
  token: string,
  input: { userId?: string; telegramId?: string; planCode: string; autoRenew: boolean }
) {
  const response = await fetch(`${apiUrl}/admin/subscriptions/grant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Manual subscription grant failed');
  return response.json();
}

export async function createSubscriptionGrant(
  token: string,
  input: { planCode: string; autoRenew: boolean; ttlMinutes?: number }
) {
  const response = await fetch(`${apiUrl}/admin/subscription-grants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Subscription grant link creation failed');
  return response.json() as Promise<{ token: string; planCode: string; expiresAt: string }>;
}
