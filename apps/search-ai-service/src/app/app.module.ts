import { Module } from '@nestjs/common';
import { DatabaseModule, Tag, VenueTag, SearchLog, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { SearchModule } from './modules/search/search.module.js';
import { ReviewProcessingModule } from './modules/review-processing/review-processing.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Tag, VenueTag, SearchLog, Venue, MenuCategory, MenuItem] }),
    SearchModule,
    ReviewProcessingModule,
  ],
})
export class AppModule {}
