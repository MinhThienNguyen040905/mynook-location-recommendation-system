import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { getJwtSecrets } from '@mynook/shared-types';
import { NotificationController } from './notification.controller.js';
import { ReviewController } from './review.controller.js';
import { ReportController } from './report.controller.js';
import { VenueReportController } from './venue-report.controller.js';
import { InteractionsController } from './interactions.controller.js';
import { FavoritesController } from './favorites.controller.js';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({
      secret: getJwtSecrets().accessSecret,
    }),
  ],
  controllers: [
    NotificationController,
    ReviewController,
    ReportController,
    VenueReportController,
    InteractionsController,
    FavoritesController,
  ],
})
export class InteractionModule {}
