import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { CloudinaryModule } from '@mynook/cloudinary';
import { VenueController } from './venue.controller.js';
import { VenueService } from './venue.service.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CloudinaryModule,
    DatabaseModule.forRoot({ entities: [Venue, MenuCategory, MenuItem] }),
  ],
  controllers: [VenueController, MenuController, UploadController],
  providers: [VenueService, MenuService],
})
export class AppModule {}
