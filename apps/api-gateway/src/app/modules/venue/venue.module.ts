import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VenueController } from './venue.controller.js';
import { MenuController } from './menu.controller.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [VenueController, MenuController, UploadController],
})
export class VenueModule {}
