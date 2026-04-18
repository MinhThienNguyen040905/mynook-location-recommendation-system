import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Review,
  UserFavorite,
  UserInteraction,
  Notification,
  ReviewReport,
} from '@mynook/database';
import { NotificationModule } from './modules/notification/notification.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { AdminInteractionModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({
      entities: [Review, UserFavorite, UserInteraction, Notification, ReviewReport],
    }),
    NotificationModule,
    ReviewModule,
    ReportModule,
    AdminInteractionModule,
  ],
})
export class AppModule {}
