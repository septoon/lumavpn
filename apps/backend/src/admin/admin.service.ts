import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService
  ) {}

  async dashboard() {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [
      users,
      activeSubscriptions,
      expiresToday,
      monthRevenue,
      totalRevenue,
      payments,
      configs,
      logs,
      subscriptions
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', expiresAt: { gte: now, lte: todayEnd } }
      }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED', createdAt: { gte: monthStart } },
        _sum: { amount: true }
      }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } }),
      this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { user: true } }),
      this.prisma.vpnConfig.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { user: true } }),
      this.prisma.log.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: true, planRef: true }
      })
    ]);

    return {
      stats: {
        users,
        activeSubscriptions,
        expiresToday,
        monthRevenue: monthRevenue._sum.amount ?? 0,
        totalRevenue: totalRevenue._sum.amount ?? 0
      },
      payments,
      configs,
      logs,
      subscriptions
    };
  }

  users() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async grantSubscription(input: {
    userId?: string;
    telegramId?: string;
    planCode: string;
    autoRenew?: boolean;
  }) {
    if (!input.userId && !input.telegramId) {
      throw new BadRequestException('userId or telegramId is required');
    }

    const user = input.userId
      ? await this.prisma.user.findUnique({ where: { id: input.userId } })
      : await this.prisma.user.upsert({
          where: { telegramId: input.telegramId! },
          update: {},
          create: { telegramId: input.telegramId! }
        });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptions.activate(
      user.id,
      input.planCode,
      Boolean(input.autoRenew)
    );

    await this.prisma.log.create({
      data: {
        type: 'ADMIN',
        payload: {
          action: 'manual_subscription_grant',
          userId: user.id,
          telegramId: user.telegramId,
          planCode: input.planCode,
          autoRenew: Boolean(input.autoRenew)
        }
      }
    });

    return subscription;
  }

  async createSubscriptionGrant(input: {
    planCode: string;
    autoRenew?: boolean;
    createdByTelegramId?: string;
    ttlMinutes?: number;
  }) {
    const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 1440) * 60_000);

    const grant = await this.prisma.subscriptionGrant.create({
      data: {
        token,
        planCode: plan.code,
        autoRenew: Boolean(input.autoRenew),
        expiresAt,
        createdByTelegramId: input.createdByTelegramId
      }
    });

    await this.prisma.log.create({
      data: {
        type: 'ADMIN',
        payload: {
          action: 'subscription_grant_created',
          token: grant.token,
          planCode: grant.planCode,
          expiresAt: grant.expiresAt.toISOString(),
          createdByTelegramId: input.createdByTelegramId
        }
      }
    });

    return grant;
  }
}
