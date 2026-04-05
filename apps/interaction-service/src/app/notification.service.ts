import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '@mynook/database';
import type { UserRegisteredEvent } from '@mynook/shared-types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  /** Tạo thông báo chào mừng khi user đăng ký thành công */
  async createWelcomeNotification(event: UserRegisteredEvent): Promise<void> {
    const displayName = event.fullName || event.email;

    const notification = this.notifRepo.create({
      account_id: event.accountId,
      title: 'Chào mừng bạn đến MyNook! 🎉',
      message: `Xin chào ${displayName}! Cảm ơn bạn đã đăng ký tài khoản MyNook. Hãy bắt đầu khám phá những địa điểm tuyệt vời xung quanh bạn nhé!`,
      type: NotificationType.SYSTEM,
    });

    await this.notifRepo.save(notification);
    this.logger.log(`Welcome notification created for account ${event.accountId}`);
  }
}
