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
   * Combines semantic vector search + tag filtering + capacity/time filters.
   *
   * Called by api-gateway: GET /api/search?q=...
   */
  @Get()
  @ApiOperation({
    summary: 'Hybrid venue search',
    description:
      'Search venues using natural language. Supports Vietnamese queries with capacity (e.g. "5 người") and time (e.g. "buổi tối") extraction.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 20)' })
  @ApiResponse({ status: 200, description: 'List of matching venues ranked by relevance' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    const maxResults = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;

    const results = await this.venueSearch.hybridSearch(
      query,
      user?.id,
      maxResults,
    );

    return {
      results,
      total: results.length,
      query,
    };
  }
}
