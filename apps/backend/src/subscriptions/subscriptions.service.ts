import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VpnConfig } from '@prisma/client';
import { addDays } from './time';
import { LogsService } from '../logs/logs.service';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { VpnProvisioningService } from '../vpn/vpn-provisioning.service';
import { SubscriptionsRepository } from './subscriptions.repository';

const TRIAL_PLAN_CODE = 'TRIAL_3';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsRepository,
    private readonly plans: PlansService,
    private readonly vpn: VpnProvisioningService,
    private readonly logs: LogsService
  ) {}

  async activate(userId: string, planCode: string, autoRenew = false, deviceFingerprint?: string) {
    const plan = await this.plans.getActiveByCode(planCode);
    const now = new Date();
    const current = await this.subscriptions.activeForUser(userId);
    const startedAt = current && current.expiresAt > now ? current.expiresAt : now;
    const expiresAt = addDays(startedAt, plan.durationDays);

    const subscription = await this.subscriptions.create({
      user: { connect: { id: userId } },
      planRef: { connect: { id: plan.id } },
      plan: plan.code,
      autoRenew,
      startedAt,
      expiresAt,
      status: 'ACTIVE'
    });

    await this.vpn.provisionForUser(userId, plan.vpnTypes, deviceFingerprint);
    await this.logs.create('SUBSCRIPTION', {
      action: 'activate',
      userId,
      plan: plan.code,
      expiresAt: expiresAt.toISOString(),
      deviceFingerprint
    });

    return subscription;
  }

  mySubscription(userId: string) {
    return this.subscriptions.activeForUser(userId);
  }

  async accessForUser(userId: string, deviceFingerprint?: string) {
    const subscription = await this.subscriptions.activeForUser(userId);
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const configs = await this.prisma.vpnConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    const scopedConfigs = configs.filter(
      (item) => !item.deviceFingerprint || item.deviceFingerprint === deviceFingerprint
    );

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            type: subscription.plan === TRIAL_PLAN_CODE ? 'trial' : 'full',
            status: subscription.status,
            autoRenew: subscription.autoRenew,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            daysRemaining: this.daysRemaining(subscription.expiresAt)
          }
        : null,
      subscriptions: subscriptions.map((item) => ({
        id: item.id,
        plan: item.plan,
        type: item.plan === TRIAL_PLAN_CODE ? 'trial' : 'full',
        status: item.status,
        autoRenew: item.autoRenew,
        startedAt: item.startedAt,
        expiresAt: item.expiresAt,
        daysRemaining: this.daysRemaining(item.expiresAt)
      })),
      configs: scopedConfigs.map((item) => this.serializeConfig(item))
    };
  }

  async startTrial(userId: string, deviceFingerprint?: string) {
    const usedTrial = await this.prisma.subscription.count({
      where: { userId, plan: TRIAL_PLAN_CODE }
    });
    if (usedTrial > 0) {
      throw new BadRequestException('Trial has already been used');
    }
    return this.activate(userId, TRIAL_PLAN_CODE, false, deviceFingerprint);
  }

  async expire(subscriptionId: string, userId: string) {
    await this.vpn.disableForUser(userId);
    await this.subscriptions.updateStatus(subscriptionId, 'EXPIRED');
  }

  async cancel(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) throw new BadRequestException('Subscription not found');
    await this.vpn.disableForUser(subscription.userId);
    return this.subscriptions.updateStatus(subscriptionId, 'CANCELLED');
  }

  async extend(subscriptionId: string, days: number) {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new BadRequestException('days must be between 1 and 365');
    }
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) throw new BadRequestException('Subscription not found');
    const base = subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        expiresAt: addDays(base, days)
      }
    });
  }

  async trialWarningsDue() {
    const now = new Date();
    const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        plan: TRIAL_PLAN_CODE,
        status: 'ACTIVE',
        expiresAt: { gt: now, lte: dayAhead }
      },
      include: { user: true },
      orderBy: { expiresAt: 'asc' }
    });
    const sentLogs = await this.prisma.log.findMany({
      where: {
        type: 'TELEGRAM',
        payload: {
          path: ['action'],
          equals: 'trial_expiry_warning_sent'
        } as Prisma.JsonFilter
      },
      take: 500,
      orderBy: { createdAt: 'desc' }
    });
    const sentIds = new Set(
      sentLogs
        .map((log) => log.payload)
        .filter((payload): payload is Prisma.JsonObject => typeof payload === 'object' && payload !== null && !Array.isArray(payload))
        .map((payload) => payload.subscriptionId)
        .filter((id): id is string => typeof id === 'string')
    );

    return subscriptions.filter((subscription) => !sentIds.has(subscription.id));
  }

  markTrialWarningSent(subscriptionId: string, telegramId: string) {
    return this.logs.create('TELEGRAM', {
      action: 'trial_expiry_warning_sent',
      subscriptionId,
      telegramId
    });
  }

  private serializeConfig(item: VpnConfig) {
    const payload = this.parseConfig(item.config);
    return {
      id: item.id,
      type: item.type,
      qrCode: item.qrCode,
      createdAt: item.createdAt,
      deviceFingerprint: item.deviceFingerprint,
      link: typeof payload.link === 'string' ? payload.link : undefined,
      conf: typeof payload.conf === 'string' ? payload.conf : undefined,
      raw: typeof payload.raw === 'string' ? payload.raw : item.config
    };
  }

  private parseConfig(config: string): Record<string, unknown> {
    try {
      return JSON.parse(config) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private daysRemaining(expiresAt: Date) {
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
  }
}
