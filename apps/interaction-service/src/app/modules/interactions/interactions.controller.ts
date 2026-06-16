import {
  Body,
  Controller,
  Get,
  Param,
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

  @Get('stats')
  @ApiOperation({ summary: 'Interaction stats for the current user' })
  @ApiResponse({ status: 200 })
  async stats(@CurrentUser() user: CurrentUserPayload | undefined) {
    if (!user?.id) throw new UnauthorizedException();
    return this.interactions.stats(user.id);
  }

  @Get('venues/:venueId/analytics')
  @ApiOperation({ summary: 'Owner analytics for a venue' })
  @ApiResponse({ status: 200 })
  async venueAnalytics(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('venueId') venueId: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.interactions.venueAnalytics(user.id, venueId);
  }
}
