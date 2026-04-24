import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  DatabaseModule,
  Venue,
  MenuCategory,
  MenuItem,
  Category,
  VenueCategory,
  City,
  District,
} from '@mynook/database';
import { VenueModule } from './modules/venue/venue.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { AdminVenueModule } from './modules/admin/admin.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { LocationModule } from './modules/location/location.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule.forRoot({
      entities: [
        Venue,
        MenuCategory,
        MenuItem,
        Category,
        VenueCategory,
        City,
        District,
      ],
    }),
    VenueModule,
    MenuModule,
    UploadModule,
    AdminVenueModule,
    CategoryModule,
    LocationModule,
  ],
})
export class AppModule {}
