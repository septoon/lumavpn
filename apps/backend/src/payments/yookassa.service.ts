import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'node:crypto';

export interface YooKassaPayment {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string };
  payment_method?: { id?: string };
}

@Injectable()
export class YooKassaService {
  constructor(private readonly config: ConfigService) {}

  async createPayment(input: {
    amountRub: number;
    description: string;
    metadata: Record<string, string | boolean>;
    savePaymentMethod: boolean;
  }): Promise<YooKassaPayment> {
    const response = await this.client().post(
      '/payments',
      {
        amount: { value: input.amountRub.toFixed(2), currency: 'RUB' },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: this.config.get<string>('YOOKASSA_RETURN_URL')
        },
        description: input.description,
        save_payment_method: input.savePaymentMethod,
        metadata: input.metadata
      },
      { headers: { 'Idempotence-Key': randomUUID() } }
    );
    return response.data as YooKassaPayment;
  }

  async createRecurringPayment(input: {
    amountRub: number;
    paymentMethodId: string;
    description: string;
    metadata: Record<string, string | boolean>;
  }): Promise<YooKassaPayment> {
    const response = await this.client().post(
      '/payments',
      {
        amount: { value: input.amountRub.toFixed(2), currency: 'RUB' },
        capture: true,
        payment_method_id: input.paymentMethodId,
        description: input.description,
        metadata: input.metadata
      },
      { headers: { 'Idempotence-Key': randomUUID() } }
    );
    return response.data as YooKassaPayment;
  }

  private client() {
    const shopId = this.config.get<string>('YOOKASSA_SHOP_ID');
    const secret = this.config.get<string>('YOOKASSA_SECRET_KEY');
    if (!shopId || !secret) throw new ServiceUnavailableException('YooKassa is not configured');
    return axios.create({
      baseURL: 'https://api.yookassa.ru/v3',
      auth: { username: shopId, password: secret },
      timeout: 10000
    });
  }
}
