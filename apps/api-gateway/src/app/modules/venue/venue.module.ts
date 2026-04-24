import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VenueController } from './venue.controller.js';
import { MenuController } from './menu.controller.js';
import { UploadController } from './upload.controller.js';
import { CategoryController } from './category.controller.js';
import { LocationController } from './location.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [
    VenueController,
    MenuController,
    UploadController,
    CategoryController,
    LocationController,
  ],
})
export class VenueModule {}
