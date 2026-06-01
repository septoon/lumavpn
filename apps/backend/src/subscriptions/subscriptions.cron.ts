import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionsCronService {
  private readonly logger = new Logger(SubscriptionsCronService.name);

  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly service: SubscriptionsService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOverdue() {
    const expired = await this.subscriptions.expiredNonRenewing(new Date());
    for (const item of expired) {
      try {
        await this.service.expire(item.id, item.userId);
      } catch (error) {
        this.logger.error(`Failed to expire subscription ${item.id}`, error as Error);
      }
    }
  }
}
