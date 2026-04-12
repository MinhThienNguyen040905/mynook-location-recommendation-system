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
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Request() req: { authHeaders?: Record<string, string> },
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', limit);

    const { data } = await firstValueFrom(
      this.http.get(
        `${SEARCH_AI_SERVICE_URL}/search?${params.toString()}`,
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
  @ApiResponse({ status: 200, description: 'Search results' })
  async publicSearch(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', limit);

    const { data } = await firstValueFrom(
      this.http.get(`${SEARCH_AI_SERVICE_URL}/search?${params.toString()}`),
    );
    return data;
  }
}
