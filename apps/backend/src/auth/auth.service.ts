import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService
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
}
