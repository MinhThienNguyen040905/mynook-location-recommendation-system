import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RMQ_EVENTS } from '@mynook/shared-types';
import type { VenueDescribedEvent } from '@mynook/shared-types';
import { DescriptionTaggingService } from './description-tagging.service.js';

/**
 * Listens for `venue.created` and `venue.updated` events emitted by
 * venue-service when a description is supplied. Runs Groq tag extraction on
 * the description and seeds `venue_tags` so brand-new venues have search
 * signal before any reviews come in.
 *
 * Both events share the same payload + handler — neither needs special
 * casing because the underlying upsert is idempotent.
 */
@Controller()
export class DescriptionTaggingController {
  private readonly logger = new Logger(DescriptionTaggingController.name);

  constructor(
    private readonly tagging: DescriptionTaggingService,
  ) {}

  @EventPattern(RMQ_EVENTS.VENUE_CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleVenueCreated(@Payload() event: any, @Ctx() context: any) {
    await this.handle('venue.created', event as VenueDescribedEvent, context);
  }

  @EventPattern(RMQ_EVENTS.VENUE_UPDATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleVenueUpdated(@Payload() event: any, @Ctx() context: any) {
    await this.handle('venue.updated', event as VenueDescribedEvent, context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handle(eventName: string, event: VenueDescribedEvent, context: any) {
    this.logger.log(
      `Received ${eventName} for venue ${event.venueId} (description ${event.description?.length ?? 0} chars)`,
    );
    try {
      await this.tagging.processDescription(event);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Failed to process ${eventName} for venue ${event.venueId}: ${error}`,
      );
      // Negative acknowledge — message goes back to queue for retry.
      // The upsert is idempotent so retries are safe.
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true);
    }
  }
}
