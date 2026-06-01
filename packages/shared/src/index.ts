import { z } from 'zod';

export const vpnTypes = ['VLESS', 'AMNEZIA', 'MTPROXY'] as const;
export const subscriptionStatuses = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'] as const;
export const paymentStatuses = ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;

export type VpnType = (typeof vpnTypes)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export const planSchema = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Z0-9_]+$/),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  priceRub: z.number().int().nonnegative(),
  durationDays: z.number().int().positive(),
  vpnTypes: z.array(z.enum(vpnTypes)).min(1),
  isActive: z.boolean().default(true)
});

export type PlanInput = z.infer<typeof planSchema>;

export const defaultPlans: PlanInput[] = [
  {
    code: 'TRIAL_3',
    title: 'Пробный период',
    description: 'VLESS Reality, MTProto Proxy и AmneziaWG на 3 дня',
    priceRub: 0,
    durationDays: 3,
    vpnTypes: ['VLESS', 'MTPROXY', 'AMNEZIA'],
    isActive: true
  },
  {
    code: 'MONTH_1',
    title: '1 месяц',
    description: 'VLESS Reality, MTProto Proxy и AmneziaWG на 30 дней',
    priceRub: 100,
    durationDays: 30,
    vpnTypes: ['VLESS', 'MTPROXY', 'AMNEZIA'],
    isActive: true
  },
  {
    code: 'MONTH_3',
    title: '3 месяца',
    description: 'VLESS Reality, MTProto Proxy и AmneziaWG на 90 дней',
    priceRub: 270,
    durationDays: 90,
    vpnTypes: ['VLESS', 'MTPROXY', 'AMNEZIA'],
    isActive: true
  },
  {
    code: 'MONTH_6',
    title: '6 месяцев',
    description: 'VLESS Reality, MTProto Proxy и AmneziaWG на 180 дней',
    priceRub: 520,
    durationDays: 180,
    vpnTypes: ['VLESS', 'MTPROXY', 'AMNEZIA'],
    isActive: true
  }
];

export interface PublicPlan {
  code: string;
  title: string;
  description: string | null;
  priceRub: number;
  durationDays: number;
  vpnTypes: VpnType[];
}
