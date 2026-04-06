import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
  getVenueReviews(@Param('venueId') venueId: string) {
    return this.reviewService.findByVenue(venueId);
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
}
