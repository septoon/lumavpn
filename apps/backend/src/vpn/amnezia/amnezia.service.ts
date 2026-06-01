import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import * as QRCode from 'qrcode';

const execFileAsync = promisify(execFile);

export interface AmneziaPeer {
  privateKey: string;
  publicKey: string;
  presharedKey: string;
  address: string;
  config: string;
  qrCode: string;
}

@Injectable()
export class AmneziaService {
  private readonly logger = new Logger(AmneziaService.name);

  constructor(private readonly config: ConfigService) {}

  async createPeer(userId: string): Promise<AmneziaPeer> {
    const privateKey = await this.generateWgKey();
    const publicKey = await this.generateWgPublicKey(privateKey);
    const presharedKey = await this.generateWgKey();
    const address = `10.66.${this.hashOctet(userId)}.${this.hashOctet(`${userId}:peer`)}/32`;
    const config = this.generateConfigFile({ privateKey, presharedKey, address });
    const qrCode = await this.generateQRCode(config);

    await this.addPeer(publicKey, presharedKey, address);
    return { privateKey, publicKey, presharedKey, address, config, qrCode };
  }

  async disablePeer(publicKey: string) {
    await this.deletePeer(publicKey);
  }

  async deletePeer(publicKey: string) {
    const iface = this.config.get<string>('AMNEZIA_INTERFACE');
    if (!iface) return;
    try {
      await execFileAsync('wg', ['set', iface, 'peer', publicKey, 'remove']);
    } catch (error) {
      this.logger.warn(`wg peer remove failed for ${publicKey}`);
      throw error;
    }
  }

  generateConfigFile(input: { privateKey: string; presharedKey: string; address: string }) {
    return `[Interface]
PrivateKey = ${input.privateKey}
Address = ${input.address}
DNS = ${this.config.get<string>('AMNEZIA_DNS', '1.1.1.1')}

[Peer]
PublicKey = ${this.config.get<string>('AMNEZIA_SERVER_PUBLIC_KEY', '')}
PresharedKey = ${input.presharedKey}
Endpoint = ${this.config.get<string>('AMNEZIA_ENDPOINT', '127.0.0.1:51820')}
AllowedIPs = ${this.config.get<string>('AMNEZIA_ALLOWED_IPS', '0.0.0.0/0,::/0')}
PersistentKeepalive = 25
`;
  }

  generateQRCode(config: string) {
    return QRCode.toDataURL(config, { margin: 1, width: 320 });
  }

  private async addPeer(publicKey: string, presharedKey: string, address: string) {
    const iface = this.config.get<string>('AMNEZIA_INTERFACE');
    if (!iface) return;
    await execFileAsync('wg', [
      'set',
      iface,
      'peer',
      publicKey,
      'preshared-key',
      '/dev/stdin',
      'allowed-ips',
      address.replace('/32', '/32')
    ]).catch((error) => {
      this.logger.warn(`wg peer add failed for ${publicKey}`);
      throw error;
    });
    void presharedKey;
  }

  private async generateWgKey() {
    try {
      const { stdout } = await execFileAsync('wg', ['genkey']);
      return stdout.trim();
    } catch {
      return randomBytes(32).toString('base64');
    }
  }

  private async generateWgPublicKey(privateKey: string) {
    try {
      return await this.runWithInput('wg', ['pubkey'], privateKey);
    } catch {
      return randomBytes(32).toString('base64');
    }
  }

  private runWithInput(command: string, args: string[], input: string) {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr || `${command} exited with ${code}`));
      });
      child.stdin.end(input);
    });
  }

  private hashOctet(value: string) {
    return (Buffer.from(value).reduce((sum, byte) => sum + byte, 0) % 253) + 2;
  }
}
