import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
import {
  AuthHeadersInterceptor,
  buildUserHeaders,
} from '../../common/interceptors/auth-headers.interceptor.js';
import type { AuthenticatedUser } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly http: HttpService,
    private readonly jwtService: JwtService,
  ) {}

  /** Lấy danh sách reviews của một venue (public) */
  @Get('venue/:venueId')
  @ApiOperation({ summary: 'Lấy danh sách reviews của một venue' })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  async getVenueReviews(
    @Param('venueId') venueId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const headers = this.buildOptionalAuthHeaders(authorization);
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/reviews/venue/${venueId}`, {
        headers,
      }),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lay danh sach reviews cua user hien tai' })
  @ApiResponse({ status: 200, description: 'Danh sach reviews cua user' })
  async getMyReviews(
    @Request() req: { authHeaders: Record<string, string> },
    @Query('limit') limit?: string,
  ) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    const { data } = await firstValueFrom(
      this.http.get(
        `${INTERACTION_SERVICE_URL}/reviews/my?${params.toString()}`,
        { headers: req.authHeaders },
      ),
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

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post(':reviewId/reaction')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/dislike hoac bo reaction tren review' })
  async setReaction(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('reviewId') reviewId: string,
    @Body() body: { reaction?: 'like' | 'dislike' | null },
  ) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${INTERACTION_SERVICE_URL}/reviews/${reviewId}/reaction`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post(':reviewId/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comment hoac reply tren review' })
  async createComment(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('reviewId') reviewId: string,
    @Body() body: { content?: string; parent_comment_id?: string | null; media?: string[] },
  ) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${INTERACTION_SERVICE_URL}/reviews/${reviewId}/comments`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  private buildOptionalAuthHeaders(
    authorization?: string,
  ): Record<string, string> | undefined {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null;
    if (!token) return undefined;

    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; type: string }>(
        token,
      );
      const user: AuthenticatedUser = {
        userId: payload.sub,
        email: payload.email,
        type: payload.type,
      };
      return buildUserHeaders(user);
    } catch {
      return undefined;
    }
  }
}
