import { Controller, Get, Patch, Param, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload, UserRegisteredEvent } from '@mynook/shared-types';
import { RMQ_EVENTS } from '@mynook/shared-types';
import { NotificationService } from './notification.service.js';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /* ── RMQ Event Handlers ── */

  @EventPattern(RMQ_EVENTS.USER_REGISTERED)
  async handleUserRegistered(@Payload() event: UserRegisteredEvent) {
    this.logger.log(`Received user.registered event for account ${event.accountId}`);
    await this.notificationService.createWelcomeNotification(event);
  }

  /* ── HTTP Endpoints (called via api-gateway) ── */

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của user' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  getMyNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.findByAccount(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificationService.countUnread(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  @ApiResponse({ status: 200, description: 'Notification đã đọc' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ApiResponse({ status: 200, description: 'Tất cả đã đọc' })
  async markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    await this.notificationService.markAllAsRead(user.id);
    return { message: 'All notifications marked as read' };
  }
}
