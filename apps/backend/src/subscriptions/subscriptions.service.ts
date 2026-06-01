import { Injectable } from '@nestjs/common';
import { addDays } from './time';
import { LogsService } from '../logs/logs.service';
import { PlansService } from '../plans/plans.service';
import { VpnProvisioningService } from '../vpn/vpn-provisioning.service';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
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

  async expire(subscriptionId: string, userId: string) {
    await this.vpn.disableForUser(userId);
    await this.subscriptions.updateStatus(subscriptionId, 'EXPIRED');
  }
}
