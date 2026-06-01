import { Injectable } from '@nestjs/common';
import { VpnType } from '@prisma/client';
import { LogsService } from '../logs/logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AmneziaService } from './amnezia/amnezia.service';
import { MtprotoService } from './mtproto/mtproto.service';
import { VlessService } from './vless/vless.service';

@Injectable()
export class VpnProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vless: VlessService,
    private readonly amnezia: AmneziaService,
    private readonly mtproto: MtprotoService,
    private readonly logs: LogsService
  ) {}

  async provisionForUser(userId: string, vpnTypes: VpnType[], deviceFingerprint?: string) {
    await this.prisma.vpnConfig.updateMany({ where: { userId }, data: { isActive: false } });
    const result = [];

    for (const type of vpnTypes) {
      if (type === 'VLESS') result.push(await this.createVless(userId, deviceFingerprint));
      if (type === 'AMNEZIA') result.push(await this.createAmnezia(userId, deviceFingerprint));
      if (type === 'MTPROXY') result.push(await this.createMtproto(userId, deviceFingerprint));
    }

    await this.logs.create('VPN', { action: 'provision', userId, vpnTypes, deviceFingerprint });
    return result;
  }

  async disableForUser(userId: string) {
    const configs = await this.prisma.vpnConfig.findMany({ where: { userId, isActive: true } });
    for (const item of configs) {
      const payload = this.parsePayload(item.config);
      if (item.type === 'VLESS' && payload.uuid) await this.vless.disableVlessUser(payload.uuid);
      if (item.type === 'AMNEZIA' && payload.publicKey) await this.amnezia.disablePeer(payload.publicKey);
      if (item.type === 'MTPROXY' && payload.secret) await this.mtproto.disableMtprotoUser(payload.secret);
    }
    await this.prisma.vpnConfig.updateMany({ where: { userId }, data: { isActive: false } });
    await this.logs.create('VPN', { action: 'disable', userId });
  }

  private async createVless(userId: string, deviceFingerprint?: string) {
    const user = await this.vless.createVlessUser(userId);
    return this.prisma.vpnConfig.create({
      data: {
        userId,
        type: 'VLESS',
        deviceFingerprint,
        config: JSON.stringify({
          uuid: user.id,
          email: user.email,
          link: user.link,
          raw: this.vless.generateVlessConfig(user.id, user.email)
        })
      }
    });
  }

  private async createAmnezia(userId: string, deviceFingerprint?: string) {
    const peer = await this.amnezia.createPeer(userId);
    return this.prisma.vpnConfig.create({
      data: {
        userId,
        type: 'AMNEZIA',
        deviceFingerprint,
        config: JSON.stringify({
          publicKey: peer.publicKey,
          address: peer.address,
          conf: peer.config
        }),
        qrCode: peer.qrCode
      }
    });
  }

  private async createMtproto(userId: string, deviceFingerprint?: string) {
    const user = this.mtproto.createMtprotoUser();
    return this.prisma.vpnConfig.create({
      data: {
        userId,
        type: 'MTPROXY',
        deviceFingerprint,
        config: JSON.stringify(user)
      }
    });
  }

  private parsePayload(config: string): Record<string, string> {
    try {
      return JSON.parse(config) as Record<string, string>;
    } catch {
      return {};
    }
  }
}
