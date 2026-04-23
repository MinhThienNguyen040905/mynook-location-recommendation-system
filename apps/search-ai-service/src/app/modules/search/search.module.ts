import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag, VenueTag, SearchLog, Venue, Category, VenueCategory } from '@mynook/database';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchParserService } from './search-parser.service.js';
import { EmbeddingService } from './embedding.service.js';
import { VenueSearchService } from './venue-search.service.js';
import { CategoryTagProviderService } from './category-tag-provider.service.js';
import { QueryExtractionService } from './query-extraction.service.js';
import { QueryCacheService } from './query-cache.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, VenueTag, SearchLog, Venue, Category, VenueCategory]),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchParserService,
    EmbeddingService,
    VenueSearchService,
    CategoryTagProviderService,
    QueryExtractionService,
    QueryCacheService,
  ],
  exports: [
    SearchService,
    SearchParserService,
    EmbeddingService,
    VenueSearchService,
    CategoryTagProviderService,
  ],
})
export class SearchModule {}
