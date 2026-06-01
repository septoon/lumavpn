import {
  BadRequestException,
  Body,
  Controller,
  Get,
  GoneException,
  Param,
  Post,
  Query
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from './users.service';

@Controller('telegram/users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService
  ) {}

  @Post()
  upsert(@Body() body: { telegramId: string; username?: string; firstName?: string }) {
    return this.users.upsertTelegramUser(body);
  }

  @Get(':userId/configs')
  async configs(@Param('userId') userId: string, @Query('deviceFingerprint') deviceFingerprint?: string) {
    const configs = await this.prisma.vpnConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (configs.some((item) => item.deviceFingerprint) && !deviceFingerprint) {
      throw new BadRequestException('Device fingerprint is required');
    }

    return configs.filter(
      (item) => !item.deviceFingerprint || item.deviceFingerprint === deviceFingerprint
    );
  }

  @Get(':userId/access')
  access(@Param('userId') userId: string, @Query('deviceFingerprint') deviceFingerprint?: string) {
    return this.subscriptions.accessForUser(userId, deviceFingerprint);
  }

  @Post(':userId/trial')
  startTrial(
    @Param('userId') userId: string,
    @Body() body: { deviceFingerprint?: string }
  ) {
    return this.subscriptions.startTrial(userId, body.deviceFingerprint);
  }

  @Post('grants/:token/claim')
  async claimGrant(
    @Param('token') token: string,
    @Body()
    body: { telegramId: string; username?: string; firstName?: string; deviceFingerprint?: string }
  ) {
    const grant = await this.prisma.subscriptionGrant.findUnique({ where: { token } });
    if (!grant) throw new BadRequestException('Grant not found');
    if (grant.status !== 'PENDING') throw new GoneException('Grant already used');
    if (grant.expiresAt < new Date()) {
      await this.prisma.subscriptionGrant.update({
        where: { id: grant.id },
        data: { status: 'EXPIRED' }
      });
      throw new GoneException('Grant expired');
    }

    const user = await this.users.upsertTelegramUser(body);
    const deviceFingerprint = body.deviceFingerprint ?? `telegram:${body.telegramId}`;
    const claimed = await this.prisma.subscriptionGrant.updateMany({
      where: { id: grant.id, status: 'PENDING' },
      data: {
        status: 'CLAIMED',
        deviceFingerprint,
        claimedByUserId: user.id,
        claimedAt: new Date()
      }
    });
    if (claimed.count !== 1) throw new GoneException('Grant already used');

    const subscription = await this.subscriptions.activate(
      user.id,
      grant.planCode,
      grant.autoRenew,
      deviceFingerprint
    );

    return { subscription, user };
  }
}
