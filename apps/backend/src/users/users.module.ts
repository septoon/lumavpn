import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService]
})
export class UsersModule {}
