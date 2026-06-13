import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
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
      secret: process.env['JWT_SECRET'] || 'mynook-dev-secret',
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
