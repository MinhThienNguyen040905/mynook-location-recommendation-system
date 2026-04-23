import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly http: HttpService) {}

  /** Lấy danh sách reviews của một venue (public) */
  @Get('venue/:venueId')
  @ApiOperation({ summary: 'Lấy danh sách reviews của một venue' })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  async getVenueReviews(@Param('venueId') venueId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/reviews/venue/${venueId}`),
    );
    return data;
  }

  /** Tạo review mới (cần auth) */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo review mới' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createReview(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: Record<string, unknown>,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${INTERACTION_SERVICE_URL}/reviews`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
