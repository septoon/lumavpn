import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

@Injectable()
export class MtprotoService {
  constructor(private readonly config: ConfigService) {}

  createMtprotoUser() {
    const secret = this.config.get<string>('MTPROTO_SECRET') || randomBytes(16).toString('hex');
    return { secret, link: this.generateTelegramLink(secret) };
  }

  disableMtprotoUser(_secret: string) {
    return Promise.resolve();
  }

  deleteMtprotoUser(secret: string) {
    return this.disableMtprotoUser(secret);
  }

  generateTelegramLink(secret: string) {
    const server = this.config.get<string>('MTPROTO_HOST', '127.0.0.1');
    const port = this.config.get<string>('MTPROTO_PORT', '443');
    return `tg://proxy?server=${server}&port=${port}&secret=${secret}`;
  }
}
