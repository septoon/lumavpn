import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface VlessUser {
  id: string;
  email: string;
  link: string;
}

@Injectable()
export class VlessService {
  private readonly logger = new Logger(VlessService.name);

  constructor(private readonly config: ConfigService) {}

  async createVlessUser(userId: string): Promise<VlessUser> {
    const id = uuidv4();
    const email = `user-${userId}`;
    await this.callXrayApi('post', '/vless/users', { id, email });
    return { id, email, link: this.generateVlessLink(id, email) };
  }

  async disableVlessUser(uuid: string) {
    await this.callXrayApi('delete', `/vless/users/${uuid}`, undefined);
  }

  async deleteVlessUser(uuid: string) {
    await this.disableVlessUser(uuid);
  }

  generateVlessConfig(uuid: string, email: string) {
    return JSON.stringify(
      {
        protocol: 'vless',
        uuid,
        email,
        flow: 'xtls-rprx-vision',
        security: 'reality',
        serverName: this.config.get<string>('XRAY_SERVER_NAME')
      },
      null,
      2
    );
  }

  generateVlessLink(uuid: string, email: string) {
    const host = this.config.get<string>('XRAY_PUBLIC_HOST', '127.0.0.1');
    const port = this.config.get<string>('XRAY_PUBLIC_PORT', '443');
    const sni = this.config.get<string>('XRAY_SERVER_NAME', host);
    const publicKey = this.config.get<string>('XRAY_REALITY_PUBLIC_KEY', '');
    const shortId = this.config.get<string>('XRAY_REALITY_SHORT_ID', '');
    const query = new URLSearchParams({
      type: 'tcp',
      security: 'reality',
      flow: 'xtls-rprx-vision',
      sni,
      fp: 'chrome',
      pbk: publicKey,
      sid: shortId
    });
    return `vless://${uuid}@${host}:${port}?${query.toString()}#${encodeURIComponent(email)}`;
  }

  private async callXrayApi(method: 'post' | 'delete', path: string, data: unknown) {
    const host = this.config.get<string>('XRAY_API_HOST');
    const port = this.config.get<string>('XRAY_API_PORT');
    if (!host || !port) return;

    try {
      await axios.request({
        method,
        url: `http://${host}:${port}${path}`,
        data,
        timeout: 5000
      });
    } catch (error) {
      this.logger.warn(`Xray API call failed: ${method.toUpperCase()} ${path}`);
      void error;
    }
  }
}
