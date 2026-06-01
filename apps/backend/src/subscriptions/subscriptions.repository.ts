import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  activeForUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { expiresAt: 'desc' },
      include: { planRef: true }
    });
  }

  create(data: Prisma.SubscriptionCreateInput) {
    return this.prisma.subscription.create({ data });
  }

  updateStatus(id: string, status: SubscriptionStatus) {
    return this.prisma.subscription.update({ where: { id }, data: { status } });
  }

  expiredNonRenewing(now: Date) {
    return this.prisma.subscription.findMany({
      where: {
        expiresAt: { lt: now },
        OR: [
          { status: 'ACTIVE', autoRenew: false },
          { status: 'PAST_DUE' }
        ]
      }
    });
  }

  expiringAutoRenew(now: Date) {
    return this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', autoRenew: true, expiresAt: { lte: now } },
      include: { user: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } }, planRef: true }
    });
  }
}
