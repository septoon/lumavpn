import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  findByPaymentId(paymentId: string) {
    return this.prisma.payment.findUnique({ where: { paymentId } });
  }

  updateStatus(paymentId: string, status: PaymentStatus, paymentMethodId?: string) {
    return this.prisma.payment.update({
      where: { paymentId },
      data: { status, paymentMethodId }
    });
  }
}
