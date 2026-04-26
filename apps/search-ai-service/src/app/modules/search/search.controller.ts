import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { VenueSearchService } from './venue-search.service.js';
import { RecommendService } from './recommend.service.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly venueSearch: VenueSearchService,
    private readonly recommend: RecommendService,
  ) {}

  @Get('recommended')
  @ApiOperation({
    summary: 'Recommend venues for the logged-in user (pgvector kNN)',
    description:
      'Builds an average-embedding taste vector from the user\'s favorites + 4★+ reviews, ' +
      'then returns nearest venues. Empty array when the user has no signals yet.',
  })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async recommended(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Query('limit') limit?: string,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Recommendations require authentication');
    }
    const max = limit ? Math.min(parseInt(limit, 10) || 6, 30) : 6;
    return this.recommend.recommendForUser(user.id, max);
  }

  @Get()
  @ApiOperation({
    summary: 'Hybrid AI venue search',
    description:
      'Vietnamese natural-language venue search. Groq intent/name/category/tags + pgvector + pg_trgm + PostGIS distance.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'debug', required: false })
  @ApiQuery({ name: 'lat', required: false, description: 'User latitude for distance ranking' })
  @ApiQuery({ name: 'lng', required: false, description: 'User longitude for distance ranking' })
  @ApiQuery({
    name: 'max_distance_m',
    required: false,
    description: 'Restrict to venues within N metres of (lat,lng)',
  })
  @ApiResponse({ status: 200 })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('debug') debug?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('max_distance_m') maxDistanceM?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query: '' };
    }

    const maxResults = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
    const skip = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;
    const debugOn = debug === 'true' || debug === '1';
    const userLat = lat ? parseFloat(lat) : undefined;
    const userLng = lng ? parseFloat(lng) : undefined;
    const maxD = maxDistanceM ? parseInt(maxDistanceM, 10) : undefined;
    const validCoords =
      userLat !== undefined &&
      userLng !== undefined &&
      !Number.isNaN(userLat) &&
      !Number.isNaN(userLng);

    const results = await this.venueSearch.hybridSearch({
      query,
      accountId: user?.id,
      limit: maxResults,
      offset: skip,
      debug: debugOn,
      userLat: validCoords ? userLat : undefined,
      userLng: validCoords ? userLng : undefined,
      maxDistanceM: validCoords && maxD ? maxD : undefined,
    });

    return {
      results,
      total: results.length,
      query,
      limit: maxResults,
      offset: skip,
    };
  }
}
