import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Review,
  UserFavorite,
  UserInteraction,
  Notification,
} from '@mynook/database';
import { NotificationModule } from './modules/notification/notification.module.js';
import { ReviewModule } from './modules/review/review.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({
      entities: [Review, UserFavorite, UserInteraction, Notification],
    }),
    NotificationModule,
    ReviewModule,
  ],
})
export class AppModule {}
