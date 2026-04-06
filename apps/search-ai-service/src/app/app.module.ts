import { Module } from '@nestjs/common';
import { DatabaseModule, Tag, VenueTag, SearchLog } from '@mynook/database';
import { SearchModule } from './modules/search/search.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ entities: [Tag, VenueTag, SearchLog] }),
    SearchModule,
  ],
})
export class AppModule {}
