import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from '@mynook/database';
import { VenueController } from './venue.controller.js';
import { VenueService } from './venue.service.js';
import { VenueEmbeddingService } from './embedding.service.js';
import { CategoryModule } from '../category/category.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Venue]), CategoryModule],
  controllers: [VenueController],
  providers: [VenueService, VenueEmbeddingService],
  exports: [VenueService, VenueEmbeddingService],
})
export class VenueModule {}
