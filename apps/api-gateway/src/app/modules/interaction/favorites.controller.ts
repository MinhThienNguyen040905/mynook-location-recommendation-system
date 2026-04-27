import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

class ToggleFavoriteBody {
  venue_id!: string;
}

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuthHeadersInterceptor)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user favorite venues' })
  @ApiResponse({ status: 200 })
  async list(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/favorites`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Get('ids')
  @ApiOperation({ summary: 'Return only the venue ids the user has favorited' })
  async listIds(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/favorites/ids`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post()
  @ApiOperation({ summary: 'Add venue to favorites (body)' })
  async addByBody(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: ToggleFavoriteBody,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${INTERACTION_SERVICE_URL}/favorites`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post(':venueId')
  @ApiOperation({ summary: 'Add venue to favorites (path)' })
  async addByParam(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('venueId') venueId: string,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${INTERACTION_SERVICE_URL}/favorites/${venueId}`,
        {},
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @Delete(':venueId')
  @ApiOperation({ summary: 'Remove venue from favorites' })
  async remove(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('venueId') venueId: string,
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${INTERACTION_SERVICE_URL}/favorites/${venueId}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
