import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { validateConfig } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { LogsModule } from './logs/logs.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { VpnModule } from './vpn/vpn.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LogsModule,
    AuthModule,
    UsersModule,
    PlansModule,
    VpnModule,
    SubscriptionsModule,
    PaymentsModule,
    WebhooksModule,
    AdminModule,
    HealthModule
  ]
})
export class AppModule {}
