import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsCronService } from './payments.cron';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { YooKassaService } from './yookassa.service';

@Module({
  imports: [LogsModule, PlansModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService, PaymentsCronService, YooKassaService],
  exports: [PaymentsService, YooKassaService]
})
export class PaymentsModule {}
