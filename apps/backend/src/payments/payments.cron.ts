import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogsService } from '../logs/logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../subscriptions/time';
import { YooKassaService } from './yookassa.service';

@Injectable()
export class PaymentsCronService {
  private readonly logger = new Logger(PaymentsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yookassa: YooKassaService,
    private readonly logs: LogsService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async renewExpiredSubscriptions() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', autoRenew: true, expiresAt: { lte: now } },
      include: {
        planRef: true,
        user: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } }
      },
      take: 50
    });

    for (const subscription of subscriptions) {
      const methodId = subscription.user.payments.find((payment) => payment.paymentMethodId)?.paymentMethodId;
      if (!methodId) {
        await this.markPastDue(subscription.id, subscription.userId, 'No saved payment method');
        continue;
      }

      try {
        const payment = await this.yookassa.createRecurringPayment({
          amountRub: subscription.planRef.priceRub,
          paymentMethodId: methodId,
          description: `LumaVPN renewal ${subscription.plan}`,
          metadata: {
            userId: subscription.userId,
            planCode: subscription.plan,
            autoRenew: true,
            subscriptionId: subscription.id
          }
        });
        await this.prisma.payment.create({
          data: {
            userId: subscription.userId,
            amount: subscription.planRef.priceRub,
            status: 'PENDING',
            paymentId: payment.id,
            paymentMethodId: methodId,
            metadata: { planCode: subscription.plan, autoRenew: true }
          }
        });
      } catch (error) {
        this.logger.warn(`Recurring payment failed for subscription ${subscription.id}`);
        await this.markPastDue(subscription.id, subscription.userId, (error as Error).message);
      }
    }
  }

  private async markPastDue(subscriptionId: string, userId: string, reason: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'PAST_DUE', expiresAt: addDays(new Date(), 3) }
    });
    await this.logs.create('PAYMENT', {
      action: 'recurring_failed',
      subscriptionId,
      userId,
      reason,
      graceDays: 3
    });
  }
}
