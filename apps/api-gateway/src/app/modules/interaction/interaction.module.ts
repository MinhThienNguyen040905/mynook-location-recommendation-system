import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationController } from './notification.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [NotificationController],
})
export class InteractionModule {}
