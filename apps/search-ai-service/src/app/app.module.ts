import { Module } from '@nestjs/common';
import { DatabaseModule, Tag, VenueTag, SearchLog, Venue, MenuCategory, MenuItem } from '@mynook/database';
import { SearchModule } from './modules/search/search.module.js';
import { ReviewProcessingModule } from './modules/review-processing/review-processing.module.js';
import { TagModule } from './modules/tag/tag.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Tag, VenueTag, SearchLog, Venue, MenuCategory, MenuItem] }),
    SearchModule,
    ReviewProcessingModule,
    TagModule,
  ],
})
export class AppModule {}
