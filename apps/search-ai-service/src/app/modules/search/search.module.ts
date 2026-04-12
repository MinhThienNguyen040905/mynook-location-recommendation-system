import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag, VenueTag, SearchLog, Venue } from '@mynook/database';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchParserService } from './search-parser.service.js';
import { EmbeddingService } from './embedding.service.js';
import { VenueSearchService } from './venue-search.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, VenueTag, SearchLog, Venue])],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchParserService,
    EmbeddingService,
    VenueSearchService,
  ],
  exports: [SearchService, SearchParserService, EmbeddingService, VenueSearchService],
})
export class SearchModule {}
