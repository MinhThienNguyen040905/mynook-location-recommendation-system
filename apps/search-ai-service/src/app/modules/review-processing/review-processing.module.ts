import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag, VenueTag } from '@mynook/database';
import { ReviewProcessingController } from './review-processing.controller.js';
import { ReviewProcessingService } from './review-processing.service.js';
import { GroqAiService } from './groq-ai.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, VenueTag])],
  controllers: [ReviewProcessingController],
  providers: [GroqAiService, ReviewProcessingService],
  exports: [ReviewProcessingService, GroqAiService],
})
export class ReviewProcessingModule {}
