import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Review,
  UserFavorite,
  UserInteraction,
  Notification,
} from '@mynook/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule.forRoot({
      entities: [Review, UserFavorite, UserInteraction, Notification],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
