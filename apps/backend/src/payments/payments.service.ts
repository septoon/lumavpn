import { Injectable, NotFoundException } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';
import { PlansService } from '../plans/plans.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePaymentDto } from './dto';
import { PaymentsRepository } from './payments.repository';
import { YooKassaPayment, YooKassaService } from './yookassa.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly plans: PlansService,
    private readonly payments: PaymentsRepository,
    private readonly yookassa: YooKassaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly logs: LogsService
  ) {}

  async create(dto: CreatePaymentDto) {
    const plan = await this.plans.getActiveByCode(dto.planCode);
    const payment = await this.yookassa.createPayment({
      amountRub: plan.priceRub,
      description: `LumaVPN ${plan.code}`,
      savePaymentMethod: Boolean(dto.autoRenew),
      metadata: { userId: dto.userId, planCode: plan.code, autoRenew: Boolean(dto.autoRenew) }
    });

    await this.payments.create({
      user: { connect: { id: dto.userId } },
      amount: plan.priceRub,
      status: 'PENDING',
      paymentId: payment.id,
      metadata: { planCode: plan.code, autoRenew: Boolean(dto.autoRenew) }
    });

    await this.logs.create('PAYMENT', { action: 'create', paymentId: payment.id, userId: dto.userId });
    return {
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url
    };
  }

  async handleSucceeded(payment: YooKassaPayment) {
    const dbPayment = await this.payments.findByPaymentId(payment.id);
    if (!dbPayment) throw new NotFoundException('Payment not found');

    const metadata = (dbPayment.metadata ?? {}) as { planCode?: string; autoRenew?: boolean };
    if (!metadata.planCode) throw new NotFoundException('Payment plan metadata not found');

    await this.payments.updateStatus(payment.id, 'SUCCEEDED', payment.payment_method?.id);
    await this.subscriptions.activate(dbPayment.userId, metadata.planCode, Boolean(metadata.autoRenew));
    await this.logs.create('PAYMENT', { action: 'succeeded', paymentId: payment.id });
  }

  async handleFailed(paymentId: string) {
    await this.payments.updateStatus(paymentId, 'FAILED');
    await this.logs.create('PAYMENT', { action: 'failed', paymentId });
  }
}
