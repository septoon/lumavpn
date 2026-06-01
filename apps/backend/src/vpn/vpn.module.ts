import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { AmneziaService } from './amnezia/amnezia.service';
import { MtprotoService } from './mtproto/mtproto.service';
import { VlessService } from './vless/vless.service';
import { VpnProvisioningService } from './vpn-provisioning.service';

@Module({
  imports: [LogsModule],
  providers: [VlessService, AmneziaService, MtprotoService, VpnProvisioningService],
  exports: [VpnProvisioningService, VlessService, AmneziaService, MtprotoService]
})
export class VpnModule {}
