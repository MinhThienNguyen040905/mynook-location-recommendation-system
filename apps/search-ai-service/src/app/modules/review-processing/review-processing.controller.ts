import { Controller, Logger, Post, Query } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RMQ_EVENTS } from '@mynook/shared-types';
import { ReviewProcessingService } from './review-processing.service.js';
import type { ReviewCreatedEvent, ReviewDeletedEvent } from './review-processing.service.js';
import { ReviewAnalysisFailedError } from './groq-ai.service.js';

@Controller()
export class ReviewProcessingController {
  private readonly logger = new Logger(ReviewProcessingController.name);

  constructor(
    private readonly reviewProcessing: ReviewProcessingService,
  ) {}

  @Post('reviews/backfill-ai-analysis')
  async backfillAiAnalysis(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('venueId') venueId?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.reviewProcessing.backfillMissingAnalyses({
      limit: limit ? Number.parseInt(limit, 10) || undefined : undefined,
      offset: offset ? Number.parseInt(offset, 10) || undefined : undefined,
      venueId: venueId || undefined,
      dryRun: dryRun === 'true' || dryRun === '1',
    });
  }

  /**
   * Handle `venue.reviewed` RabbitMQ event emitted by interaction-service.
   * Processes review with Groq AI and updates VenueTag scores.
   *
   * The AI analysis result is sent back via HTTP to interaction-service
   * to update the review's `ai_analysis_json` field.
   */
  @EventPattern(RMQ_EVENTS.VENUE_REVIEWED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleReviewCreated(@Payload() event: any, @Ctx() context: any) {
    const reviewEvent = event as ReviewCreatedEvent;
    this.logger.log(`Received review event: ${reviewEvent.reviewId} for venue ${reviewEvent.venueId}`);

    try {
      const analysis = await this.reviewProcessing.processReview(reviewEvent);

      if (analysis) {
        // Update the review's ai_analysis_json via HTTP callback to interaction-service
        await this.updateReviewAnalysis(reviewEvent.reviewId, analysis);
      }

      this.settle(context, `review:${reviewEvent.reviewId}`, 'ack');
    } catch (error) {
      if (error instanceof ReviewAnalysisFailedError) {
        // AI lỗi / vượt hạn mức: thử lại ngay chỉ tạo vòng lặp gọi AI (spec 018 AC-3.3).
        // Bỏ qua — review giữ ai_analysis_json = NULL, phân tích bù sau bằng backfill.
        this.logger.warn(
          `AI analysis unavailable for review ${reviewEvent.reviewId} — skipped, use backfill later: ${error.message}`,
        );
        this.settle(context, `review:${reviewEvent.reviewId}`, 'ack');
        return;
      }
      this.logger.error(`Failed to process review ${reviewEvent.reviewId}: ${error}`);
      this.settle(context, `review:${reviewEvent.reviewId}`, 'retry');
    }
  }

  /**
   * Số lần thử lại tối đa cho lỗi tạm thời (DB, mạng nội bộ) trước khi bỏ message.
   * Đếm trong bộ nhớ theo khoá message: RabbitMQ không cho sửa header khi nack + requeue.
   * Service khởi động lại → bộ đếm về 0 (chấp nhận được: vẫn có giới hạn mỗi tiến trình).
   */
  private static readonly MAX_RETRIES = 3;
  private readonly retryCounts = new Map<string, number>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private settle(context: any, key: string, outcome: 'ack' | 'retry'): void {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    if (outcome === 'ack') {
      this.retryCounts.delete(key);
      channel.ack(originalMsg);
      return;
    }
    const attempts = (this.retryCounts.get(key) ?? 0) + 1;
    if (attempts > ReviewProcessingController.MAX_RETRIES) {
      this.retryCounts.delete(key);
      this.logger.error(
        `Giving up on ${key} after ${ReviewProcessingController.MAX_RETRIES} retries — message dropped`,
      );
      channel.ack(originalMsg);
      return;
    }
    this.retryCounts.set(key, attempts);
    this.logger.warn(`Retrying ${key} (${attempts}/${ReviewProcessingController.MAX_RETRIES})`);
    channel.nack(originalMsg, false, true);
  }

  /**
   * Handle `venue.review.deleted` — reverse the venue_tag deltas previously applied
   * for this review (using the AI analysis snapshot captured at delete time).
   */
  @EventPattern(RMQ_EVENTS.VENUE_REVIEW_DELETED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleReviewDeleted(@Payload() event: any, @Ctx() context: any) {
    const deletedEvent = event as ReviewDeletedEvent;
    this.logger.log(
      `Received review-deleted event: ${deletedEvent.reviewId} for venue ${deletedEvent.venueId}`,
    );

    try {
      await this.reviewProcessing.revertReview(deletedEvent);
      this.settle(context, `revert:${deletedEvent.reviewId}`, 'ack');
    } catch (error) {
      this.logger.error(
        `Failed to revert review ${deletedEvent.reviewId}: ${error}`,
      );
      this.settle(context, `revert:${deletedEvent.reviewId}`, 'retry');
    }
  }

  /**
   * Call interaction-service to persist AI analysis on the review record.
   */
  private async updateReviewAnalysis(
    reviewId: string,
    analysis: unknown,
  ): Promise<void> {
    try {
      const interactionUrl =
        process.env['INTERACTION_SERVICE_URL'] || 'http://localhost:3004';

      const response = await fetch(
        `${interactionUrl}/reviews/${reviewId}/ai-analysis`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_analysis_json: analysis }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to update review ${reviewId} AI analysis: ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error(`HTTP callback to interaction-service failed: ${error}`);
    }
  }
}
