import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { ActivateSubscriptionDto } from './dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('user/:userId')
  my(@Param('userId') userId: string) {
    return this.subscriptions.mySubscription(userId);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post('activate')
  activate(@Body() dto: ActivateSubscriptionDto) {
    return this.subscriptions.activate(dto.userId, dto.planCode, dto.autoRenew);
  }
}
