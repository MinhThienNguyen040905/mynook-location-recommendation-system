import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Notification } from '@mynook/database';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Notification])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
