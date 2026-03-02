import { Module } from '@nestjs/common';
import { AppGateway } from './gateway.gateway';
import { GatewayService } from './gateway.service';

@Module({
  providers: [AppGateway, GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
