import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { VenueModule } from './modules/venue/venue.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { UploadModule } from './modules/upload/upload.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule.forRoot({ entities: [Venue, MenuCategory, MenuItem] }),
    VenueModule,
    MenuModule,
    UploadModule,
  ],
})
export class AppModule {}
