import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { FavoritesService } from './favorites.service.js';

class ToggleFavoriteDto {
  venue_id!: string;
}

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List favorite venues for the current user' })
  @ApiResponse({ status: 200 })
  async list(@CurrentUser() user: CurrentUserPayload | undefined) {
    if (!user?.id) throw new UnauthorizedException();
    return this.favorites.list(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Return only the venue ids the user has favorited' })
  async listIds(@CurrentUser() user: CurrentUserPayload | undefined) {
    if (!user?.id) throw new UnauthorizedException();
    return { venue_ids: await this.favorites.listIds(user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Add a venue to favorites' })
  async addByBody(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Body() body: ToggleFavoriteDto,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.favorites.add(user.id, body.venue_id);
  }

  @Post(':venueId')
  @ApiOperation({ summary: 'Add a venue to favorites (path param)' })
  async addByParam(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('venueId') venueId: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.favorites.add(user.id, venueId);
  }

  @Delete(':venueId')
  @ApiOperation({ summary: 'Remove a venue from favorites' })
  async remove(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('venueId') venueId: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.favorites.remove(user.id, venueId);
  }
}
