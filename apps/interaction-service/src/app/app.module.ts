import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Review,
  UserFavorite,
  UserInteraction,
  Notification,
  ReviewReport,
  VenueReport,
} from '@mynook/database';
import { NotificationModule } from './modules/notification/notification.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { AdminInteractionModule } from './modules/admin/admin.module.js';
import { InteractionsModule } from './modules/interactions/interactions.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({
      entities: [
        Review,
        UserFavorite,
        UserInteraction,
        Notification,
        ReviewReport,
        VenueReport,
      ],
    }),
    NotificationModule,
    ReviewModule,
    ReportModule,
    AdminInteractionModule,
    InteractionsModule,
    FavoritesModule,
  ],
})
export class AppModule {}
