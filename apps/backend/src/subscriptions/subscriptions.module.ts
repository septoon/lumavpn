import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { PlansModule } from '../plans/plans.module';
import { VpnModule } from '../vpn/vpn.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsCronService } from './subscriptions.cron';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [LogsModule, PlansModule, VpnModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsRepository, SubscriptionsService, SubscriptionsCronService],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
