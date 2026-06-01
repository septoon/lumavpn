import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TelegramUserInput {
  telegramId: string;
  username?: string;
  firstName?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertTelegramUser(input: TelegramUserInput) {
    const data = {
      telegramId: input.telegramId,
      username: input.username,
      firstName: input.firstName
    };

    return this.prisma.user.upsert({
      where: { telegramId: data.telegramId },
      update: { username: data.username, firstName: data.firstName },
      create: data
    });
  }

  findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  list(take = 100) {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take });
  }
}
