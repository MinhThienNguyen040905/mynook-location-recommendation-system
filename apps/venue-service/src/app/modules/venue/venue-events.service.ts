import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  RMQ_EVENTS,
  VenueDescribedEvent,
} from '@mynook/shared-types';

const VENUE_EVENTS = RMQ_EVENTS;

/**
 * Centralised publisher for venue domain events. Owns the lazy RMQ connect
 * so multiple call sites (VenueService, AdminVenueService, future modules)
 * don't each duplicate the OnModuleInit + connection-state plumbing.
 *
 * Emits are best-effort: if RabbitMQ is unreachable on boot, events are
 * silently skipped rather than failing the venue create/update HTTP request.
 * Search-ai-service's description-tagging consumer is purely a "nice to have"
 * boost for new venues — losing an event just means the venue starts with
 * zero seed tags (the existing baseline).
 */
@Injectable()
export class VenueEventsService implements OnModuleInit {
  private readonly logger = new Logger(VenueEventsService.name);
  private rmqConnected = false;

  constructor(
    @Inject('EVENTS_SERVICE') private readonly events: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.events.connect();
      this.rmqConnected = true;
      this.logger.log('Connected to RabbitMQ (EVENTS_SERVICE)');
    } catch (err) {
      this.logger.warn(
        `RabbitMQ not available: ${(err as Error).message}. Venue events will be skipped.`,
      );
    }
  }

  /**
   * Emit `venue.created` / `venue.updated` carrying the description so the
   * search-ai-service can seed tags. No-ops when description is empty (no
   * point sending an event the consumer would discard) or when RMQ is down.
   */
  emitDescribed(
    eventName: typeof VENUE_EVENTS.VENUE_CREATED | typeof VENUE_EVENTS.VENUE_UPDATED,
    payload: {
      venueId: string;
      name: string;
      branchName?: string | null;
      description?: string | null;
    },
  ): void {
    const description = payload.description?.trim();
    if (!description) return;
    if (!this.rmqConnected) {
      this.logger.debug(
        `Skipping ${eventName} for venue ${payload.venueId} — RMQ not connected`,
      );
      return;
    }

    const event: VenueDescribedEvent = {
      venueId: payload.venueId,
      name: payload.name,
      branchName: payload.branchName ?? null,
      description,
    };

    this.events.emit(eventName, event).subscribe({
      next: () =>
        this.logger.log(
          `Emitted ${eventName} for venue ${payload.venueId} (${description.length} chars)`,
        ),
      error: (err: Error) =>
        this.logger.warn(
          `Failed to emit ${eventName} for venue ${payload.venueId}: ${err.message}`,
        ),
    });
  }
}
