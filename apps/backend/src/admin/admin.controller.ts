import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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

  @Post('subscriptions/grant')
  grantSubscription(@Body() dto: GrantSubscriptionDto) {
    return this.admin.grantSubscription(dto);
  }

  @Post('subscription-grants')
  createSubscriptionGrant(@Body() dto: CreateSubscriptionGrantDto) {
    return this.admin.createSubscriptionGrant(dto);
  }
}
