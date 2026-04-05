import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RMQ_EVENTS } from '@mynook/shared-types';
import type { UserRegisteredEvent } from '@mynook/shared-types';
import { NotificationService } from './notification.service.js';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(RMQ_EVENTS.USER_REGISTERED)
  async handleUserRegistered(@Payload() event: UserRegisteredEvent) {
    this.logger.log(`Received user.registered event for account ${event.accountId}`);
    await this.notificationService.createWelcomeNotification(event);
  }
}
