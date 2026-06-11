import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { ReviewService } from './review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('venue/:venueId')
  @ApiOperation({ summary: 'Lấy danh sách reviews của một venue' })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  getVenueReviews(
    @Param('venueId') venueId: string,
    @CurrentUser() user: CurrentUserPayload | undefined,
  ) {
    return this.reviewService.findByVenue(venueId, user?.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách reviews của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Danh sách reviews của user' })
  getMyReviews(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Query('limit') limit?: string,
  ) {
    if (!user?.id) throw new UnauthorizedException();
    const max = limit ? parseInt(limit, 10) || 20 : 20;
    return this.reviewService.findByAccount(user.id, max);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo review mới' })
  @ApiResponse({ status: 201, description: 'Review created' })
  createReview(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(user.id, dto);
  }

  @Post(':reviewId/reaction')
  @ApiOperation({ summary: 'Like/dislike hoac bo reaction tren review' })
  setReaction(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('reviewId') reviewId: string,
    @Body() body: { reaction?: 'like' | 'dislike' | null },
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.reviewService.setReaction(user.id, reviewId, body.reaction ?? null);
  }

  @Post(':reviewId/comments')
  @ApiOperation({ summary: 'Comment hoac reply tren review' })
  createComment(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('reviewId') reviewId: string,
    @Body() body: { content?: string; parent_comment_id?: string | null; media?: string[] },
  ) {
    if (!user?.id) throw new UnauthorizedException();
    return this.reviewService.createComment(
      user.id,
      reviewId,
      body.content ?? '',
      body.parent_comment_id ?? null,
      body.media ?? [],
    );
  }

  @Post('seed/google-maps')
  @ApiOperation({ summary: 'Seed Google Maps review snippets (internal)' })
  seedGoogleMapsReviews(
    @Body()
    body: {
      venue_id: string;
      reviews: Array<{
        source_review_id?: string | null;
        author_name?: string | null;
        rating: number;
        content: string;
        published_at?: string | null;
        media?: string[] | null;
      }>;
    },
  ) {
    return this.reviewService.seedGoogleMapsReviews(body);
  }

  /**
   * Internal endpoint - called by search-ai-service to save AI analysis result.
   * NOT exposed via api-gateway (internal service-to-service only).
   */
  @Patch(':reviewId/ai-analysis')
  @ApiOperation({ summary: 'Update AI analysis on review (internal)' })
  updateAiAnalysis(
    @Param('reviewId') reviewId: string,
    @Body() body: { ai_analysis_json: unknown },
  ) {
    return this.reviewService.updateAiAnalysis(reviewId, body.ai_analysis_json);
  }
}
