import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RMQ_EVENTS } from '@mynook/shared-types';
import { ReviewProcessingService } from './review-processing.service.js';
import type { ReviewCreatedEvent, ReviewDeletedEvent } from './review-processing.service.js';

@Controller()
export class ReviewProcessingController {
  private readonly logger = new Logger(ReviewProcessingController.name);

  constructor(
    private readonly reviewProcessing: ReviewProcessingService,
  ) {}

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

      // Acknowledge the RMQ message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Failed to process review ${reviewEvent.reviewId}: ${error}`);
      // Negative acknowledge — message goes back to queue for retry
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true);
    }
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
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Failed to revert review ${deletedEvent.reviewId}: ${error}`,
      );
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true);
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
