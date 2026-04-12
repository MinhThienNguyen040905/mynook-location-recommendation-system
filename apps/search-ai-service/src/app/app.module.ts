import { Module } from '@nestjs/common';
import { DatabaseModule, Tag, VenueTag, SearchLog, Venue } from '@mynook/database';
import { SearchModule } from './modules/search/search.module.js';
import { ReviewProcessingModule } from './modules/review-processing/review-processing.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Tag, VenueTag, SearchLog, Venue] }),
    SearchModule,
    ReviewProcessingModule,
  ],
})
export class AppModule {}
