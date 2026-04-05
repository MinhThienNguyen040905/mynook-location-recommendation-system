import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Review,
  UserFavorite,
  UserInteraction,
  Notification,
} from '@mynook/database';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';

@Module({
  imports: [
    DatabaseModule.forRoot({
      entities: [Review, UserFavorite, UserInteraction, Notification],
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class AppModule {}
