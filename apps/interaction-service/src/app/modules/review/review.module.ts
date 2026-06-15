import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review, ReviewComment, ReviewReaction } from '@mynook/database';
import { RmqModule } from '@mynook/rmq-messaging';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewComment, ReviewReaction]),
    RmqModule.registerPublisher({ name: 'EVENTS_SERVICE' }),
    NotificationModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
