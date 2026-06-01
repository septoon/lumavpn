import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type TelegramInitUser = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async loginAdmin(email: string, password: string) {
    const adminEmail = this.config.getOrThrow<string>('ADMIN_EMAIL');
    const adminPassword = this.config.getOrThrow<string>('ADMIN_PASSWORD');
    const isHash = adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$');
    const passwordMatches = isHash
      ? await bcrypt.compare(password, adminPassword)
      : password === adminPassword;

    if (email !== adminEmail || !passwordMatches) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: adminEmail, role: 'admin' })
    };
  }

  async loginTelegramWebApp(initData: string) {
    const telegramUser = this.verifyTelegramInitData(initData);
    const telegramId = String(telegramUser.id);
    const user = await this.prisma.user.upsert({
      where: { telegramId },
      update: {
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null
      },
      create: {
        telegramId,
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null
      }
    });
    const isAdmin = this.isTelegramAdmin(telegramId);

    return {
      user,
      telegramUser: {
        id: telegramId,
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        photoUrl: telegramUser.photo_url ?? null
      },
      isAdmin,
      accessToken: isAdmin
        ? await this.jwt.signAsync({ sub: telegramId, role: 'admin', provider: 'telegram' })
        : undefined
    };
  }

  private verifyTelegramInitData(initData: string): TelegramInitUser {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram WebApp auth is not configured');
    }

    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) {
      throw new UnauthorizedException('Telegram WebApp auth hash is missing');
    }

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

    const expected = Buffer.from(expectedHash, 'hex');
    const received = Buffer.from(receivedHash, 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Invalid Telegram WebApp auth');
    }

    const authDate = Number(params.get('auth_date') ?? 0);
    const maxAgeSeconds = 24 * 60 * 60;
    if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) {
      throw new UnauthorizedException('Telegram WebApp auth expired');
    }

    const rawUser = params.get('user');
    if (!rawUser) {
      throw new UnauthorizedException('Telegram WebApp user is missing');
    }

    try {
      const user = JSON.parse(rawUser) as TelegramInitUser;
      if (!user.id) {
        throw new Error('Telegram user id is missing');
      }
      return user;
    } catch {
      throw new UnauthorizedException('Invalid Telegram WebApp user');
    }
  }

  private isTelegramAdmin(telegramId: string) {
    return (this.config.get<string>('TELEGRAM_ADMIN_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(telegramId);
  }
}
