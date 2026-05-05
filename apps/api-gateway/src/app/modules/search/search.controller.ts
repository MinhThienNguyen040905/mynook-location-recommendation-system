import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SEARCH_AI_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly http: HttpService) {}

  /**
   * Hybrid venue search — proxied to search-ai-service.
   * Auth is optional: logged-in users get personalized search logging.
   */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search venues (hybrid: semantic + tags + filters)',
    description:
      'Natural language venue search. Supports Vietnamese queries with capacity/time extraction.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset (default 0)' })
  @ApiQuery({ name: 'debug', required: false, description: 'Set to 1 to include score_breakdown' })
  @ApiQuery({ name: 'lat', required: false, description: 'User latitude for distance ranking' })
  @ApiQuery({ name: 'lng', required: false, description: 'User longitude for distance ranking' })
  @ApiQuery({ name: 'max_distance_m', required: false, description: 'Bounding-box ST_DWithin radius in meters' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Request() req: { authHeaders?: Record<string, string> },
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('debug') debug?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('max_distance_m') maxDistanceM?: string,
  ) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    if (debug) params.set('debug', debug);
    if (lat) params.set('lat', lat);
    if (lng) params.set('lng', lng);
    if (maxDistanceM) params.set('max_distance_m', maxDistanceM);

    const { data } = await firstValueFrom(
      this.http.get(
        `${SEARCH_AI_SERVICE_URL}/search?${params.toString()}`,
        { headers: req.authHeaders || {} },
      ),
    );
    return data;
  }

  /**
   * Personalized recommendations (logged-in only). Empty array if the user has
   * no signals (no favorites and no 4★+ reviews) — FE should fall back gracefully.
   */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('recommended')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommended venues for the current user' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Recommended venues (may be empty)' })
  async recommended(
    @Request() req: { authHeaders?: Record<string, string> },
    @Query('limit') limit?: string,
  ) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    const { data } = await firstValueFrom(
      this.http.get(
        `${SEARCH_AI_SERVICE_URL}/search/recommended?${params.toString()}`,
        { headers: req.authHeaders || {} },
      ),
    );
    return data;
  }

  /**
   * Public search (no auth required) — for unauthenticated users.
   */
  @Get('public')
  @ApiOperation({ summary: 'Public venue search (no auth required)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'debug', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'max_distance_m', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async publicSearch(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('debug') debug?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('max_distance_m') maxDistanceM?: string,
  ) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    if (debug) params.set('debug', debug);
    if (lat) params.set('lat', lat);
    if (lng) params.set('lng', lng);
    if (maxDistanceM) params.set('max_distance_m', maxDistanceM);

    const { data } = await firstValueFrom(
      this.http.get(`${SEARCH_AI_SERVICE_URL}/search?${params.toString()}`),
    );
    return data;
  }
}
