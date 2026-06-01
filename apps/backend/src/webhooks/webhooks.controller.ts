import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from '../payments/payments.service';
import { YooKassaPayment } from '../payments/yookassa.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService
  ) {}

  @Post('yookassa')
  async yookassa(@Body() body: { event: string; object: YooKassaPayment }, @Headers('x-webhook-secret') secret?: string) {
    const expected = this.config.get<string>('YOOKASSA_WEBHOOK_SECRET');
    if (expected && secret !== expected) throw new UnauthorizedException('Invalid webhook secret');

    if (body.event === 'payment.succeeded') await this.payments.handleSucceeded(body.object);
    if (body.event === 'payment.canceled') await this.payments.handleFailed(body.object.id);
    return { ok: true };
  }
}
