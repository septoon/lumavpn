import { Injectable } from '@nestjs/common';
import { TelegramUserInput, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  upsertTelegramUser(input: TelegramUserInput) {
    return this.users.upsertTelegramUser(input);
  }

  findByTelegramId(telegramId: string) {
    return this.users.findByTelegramId(telegramId);
  }

  list() {
    return this.users.list();
  }
}
