import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { InteractionsService } from './interactions.service.js';

class TrackViewDto {
  venue_id!: string;
}

@ApiTags('Interactions')
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Post('view')
  @ApiOperation({ summary: 'Track that the user viewed a venue' })
  @ApiResponse({ status: 201 })
  async trackView(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Body() body: TrackViewDto,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    await this.interactions.trackView(user.id, body.venue_id);
    return { ok: true };
  }

  @Get('recently-viewed')
  @ApiOperation({ summary: 'Recently viewed venues for the current user' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async recentlyViewed(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Query('limit') limit?: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    const max = limit ? Math.min(parseInt(limit, 10) || 8, 30) : 8;
    return this.interactions.recentlyViewed(user.id, max);
  }
}
