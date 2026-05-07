import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminUserController } from './admin-user.controller.js';
import { AdminVenueController } from './admin-venue.controller.js';
import { AdminReviewController } from './admin-review.controller.js';
import { AdminVenueReportController } from './admin-venue-report.controller.js';
import { AdminNotificationController } from './admin-notification.controller.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { AdminCategoryController } from './admin-category.controller.js';
import { AdminLocationController } from './admin-location.controller.js';
import { AdminImportController } from './admin-import.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [
    AdminUserController,
    AdminVenueController,
    AdminReviewController,
    AdminVenueReportController,
    AdminNotificationController,
    AdminDashboardController,
    AdminCategoryController,
    AdminLocationController,
    AdminImportController,
  ],
})
export class AdminModule {}
