import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

class TrackViewBody {
  venue_id!: string;
}

@ApiTags('Interactions')
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly http: HttpService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post('view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track that the current user viewed a venue' })
  @ApiResponse({ status: 201 })
  async trackView(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: TrackViewBody,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${INTERACTION_SERVICE_URL}/interactions/view`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('recently-viewed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recently viewed venues for the current user' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async recentlyViewed(
    @Request() req: { authHeaders: Record<string, string> },
    @Query('limit') limit?: string,
  ) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    const { data } = await firstValueFrom(
      this.http.get(
        `${INTERACTION_SERVICE_URL}/interactions/recently-viewed?${params.toString()}`,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }
}
