import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, Review, UserFavorite } from '@mynook/database';
import { AdminInteractionController } from './admin.controller.js';
import { AdminInteractionService } from './admin.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Notification, UserFavorite])],
  controllers: [AdminInteractionController],
  providers: [AdminInteractionService],
})
export class AdminInteractionModule {}
