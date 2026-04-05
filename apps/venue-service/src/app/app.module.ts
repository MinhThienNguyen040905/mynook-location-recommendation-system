import { Module } from '@nestjs/common';
import { DatabaseModule, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { VenueController } from './venue.controller.js';
import { VenueService } from './venue.service.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Venue, MenuCategory, MenuItem] }),
  ],
  controllers: [VenueController],
  providers: [VenueService],
})
export class AppModule {}
