import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Venue,
  VenueImport,
  VenueImportReviewSource,
} from '@mynook/database';
import { CategoryModule } from '../category/category.module.js';
import { LocationModule } from '../location/location.module.js';
import { VenueModule } from '../venue/venue.module.js';
import { GoogleMapsImportController } from './google-maps-import.controller.js';
import { GoogleMapsImportService } from './google-maps-import.service.js';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Venue, VenueImport, VenueImportReviewSource]),
    CategoryModule,
    LocationModule,
    VenueModule,
  ],
  controllers: [GoogleMapsImportController],
  providers: [GoogleMapsImportService],
  exports: [GoogleMapsImportService],
})
export class GoogleMapsImportModule {}
