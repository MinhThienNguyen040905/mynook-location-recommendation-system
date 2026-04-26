import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationController } from './notification.controller.js';
import { ReviewController } from './review.controller.js';
import { ReportController } from './report.controller.js';
import { VenueReportController } from './venue-report.controller.js';
import { InteractionsController } from './interactions.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [
    NotificationController,
    ReviewController,
    ReportController,
    VenueReportController,
    InteractionsController,
  ],
})
export class InteractionModule {}
