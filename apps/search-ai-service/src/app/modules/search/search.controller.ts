import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { VenueSearchService } from './venue-search.service.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly venueSearch: VenueSearchService) {}

  /**
   * Hybrid search endpoint.
   * Combines AI query extraction (Groq) + semantic vector search + tag + category matching.
   *
   * Called by api-gateway: GET /api/search?q=...
   */
  @Get()
  @ApiOperation({
    summary: 'Hybrid AI venue search',
    description:
      'Vietnamese natural-language venue search. Groq-powered intent detection + pgvector + pg_trgm + tag/category filtering.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({
    name: 'debug',
    required: false,
    description: 'Include per-venue score breakdown in response',
  })
  @ApiResponse({ status: 200 })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('debug') debug?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query: '' };
    }

    const maxResults = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
    const skip = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;
    const debugOn = debug === 'true' || debug === '1';

    const results = await this.venueSearch.hybridSearch(
      query,
      user?.id,
      maxResults,
      skip,
      debugOn,
    );

    return {
      results,
      total: results.length,
      query,
      limit: maxResults,
      offset: skip,
    };
  }
}
