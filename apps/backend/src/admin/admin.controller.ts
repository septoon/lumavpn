import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

class GrantSubscriptionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  telegramId?: string;

  @IsString()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

class CreateSubscriptionGrantDto {
  @IsString()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  createdByTelegramId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10080)
  ttlMinutes?: number;
}

class ExtendSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}

class MarkTrialWarningSentDto {
  @IsString()
  telegramId!: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Post('users/:userId/disable')
  disableUser(@Param('userId') userId: string) {
    return this.admin.disableUser(userId);
  }

  @Post('users/:userId/extend')
  extendUser(@Param('userId') userId: string, @Body() dto: ExtendSubscriptionDto) {
    return this.admin.extendUser(userId, dto.days);
  }

  @Post('subscriptions/grant')
  grantSubscription(@Body() dto: GrantSubscriptionDto) {
    return this.admin.grantSubscription(dto);
  }

  @Post('subscriptions/:subscriptionId/extend')
  extendSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ExtendSubscriptionDto
  ) {
    return this.admin.extendSubscription(subscriptionId, dto.days);
  }

  @Post('subscription-grants')
  createSubscriptionGrant(@Body() dto: CreateSubscriptionGrantDto) {
    return this.admin.createSubscriptionGrant(dto);
  }

  @Get('trials/warnings-due')
  trialWarningsDue() {
    return this.admin.trialWarningsDue();
  }

  @Post('trials/:subscriptionId/warning-sent')
  markTrialWarningSent(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: MarkTrialWarningSentDto
  ) {
    return this.admin.markTrialWarningSent(subscriptionId, dto.telegramId);
  }
}
