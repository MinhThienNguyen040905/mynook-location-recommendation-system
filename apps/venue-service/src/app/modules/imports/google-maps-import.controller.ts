import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { GoogleMapsImportService } from './google-maps-import.service.js';
import { VenueImportStatus } from '@mynook/database';

@ApiTags('Google Maps Imports')
@Controller('imports/google-maps')
export class GoogleMapsImportController {
  constructor(private readonly importService: GoogleMapsImportService) {}

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve Google Maps input into a normalized draft preview' })
  resolve(@Body() body: Record<string, unknown>) {
    return this.importService.resolve(body as never);
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Create a Google Maps import draft' })
  createDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.importService.createDraft(user.id, body as never);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'List Google Maps import drafts' })
  list(@Query('status') status?: VenueImportStatus | 'all') {
    return this.importService.listDrafts(status);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get a Google Maps import draft' })
  get(@Param('id') id: string) {
    return this.importService.getDraft(id);
  }

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'Update normalized draft data' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.importService.updateDraft(id, body as never);
  }

  @Post('drafts/:id/enrich')
  @ApiOperation({ summary: 'Run enrichment on a draft' })
  enrich(@Param('id') id: string) {
    return this.importService.enrichDraft(id);
  }

  @Post('drafts/:id/import-reviews')
  @ApiOperation({ summary: 'Select review snippets to seed on publish' })
  importReviews(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const reviews = Array.isArray(body['reviews'])
      ? (body['reviews'] as Array<Record<string, unknown>>).map((review) => ({
          source_review_id: typeof review['source_review_id'] === 'string' ? review['source_review_id'] : null,
          author_name: typeof review['author_name'] === 'string' ? review['author_name'] : null,
          rating: Number(review['rating'] ?? 0),
          content: typeof review['content'] === 'string' ? review['content'] : '',
          published_at: typeof review['published_at'] === 'string' ? review['published_at'] : null,
        }))
      : [];
    return this.importService.selectReviews(id, reviews);
  }

  @Post('drafts/:id/publish')
  @ApiOperation({ summary: 'Publish a draft as a venue' })
  publish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.importService.publishDraft(id, user.id);
  }

  @Post('drafts/:id/reject')
  @ApiOperation({ summary: 'Reject a draft' })
  reject(@Param('id') id: string) {
    return this.importService.rejectDraft(id);
  }
}
