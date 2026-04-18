import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationController } from './notification.controller.js';
import { ReviewController } from './review.controller.js';
import { ReportController } from './report.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [NotificationController, ReviewController, ReportController],
})
export class InteractionModule {}
