import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminUserController } from './admin-user.controller.js';
import { AdminVenueController } from './admin-venue.controller.js';
import { AdminReviewController } from './admin-review.controller.js';
import { AdminNotificationController } from './admin-notification.controller.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [
    AdminUserController,
    AdminVenueController,
    AdminReviewController,
    AdminNotificationController,
    AdminDashboardController,
  ],
})
export class AdminModule {}
