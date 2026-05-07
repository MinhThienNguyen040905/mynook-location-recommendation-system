import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from '@mynook/database';
import { RmqModule } from '@mynook/rmq-messaging';
import { VenueController } from './venue.controller.js';
import { VenueService } from './venue.service.js';
import { VenueEmbeddingService } from './embedding.service.js';
import { VenueEventsService } from './venue-events.service.js';
import { CategoryModule } from '../category/category.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue]),
    CategoryModule,
    RmqModule.registerPublisher({ name: 'EVENTS_SERVICE' }),
  ],
  controllers: [VenueController],
  providers: [VenueService, VenueEmbeddingService, VenueEventsService],
  exports: [VenueService, VenueEmbeddingService, VenueEventsService],
})
export class VenueModule {}
