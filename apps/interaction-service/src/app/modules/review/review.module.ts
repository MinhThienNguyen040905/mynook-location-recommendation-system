import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '@mynook/database';
import { RmqModule } from '@mynook/rmq-messaging';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    RmqModule.registerPublisher({ name: 'EVENTS_SERVICE' }),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
