import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { DescriptionTaggingController } from './description-tagging.controller.js';
import { DescriptionTaggingService } from './description-tagging.service.js';
import { DescriptionGroqService } from './description-groq.service.js';

/**
 * Listens for venue.created / venue.updated events and seeds `venue_tags`
 * from the owner-supplied description. Imports SearchModule for access to
 * `CategoryTagProviderService` (candidate tag list + key→id resolver).
 */
@Module({
  imports: [SearchModule],
  controllers: [DescriptionTaggingController],
  providers: [DescriptionTaggingService, DescriptionGroqService],
})
export class DescriptionTaggingModule {}
