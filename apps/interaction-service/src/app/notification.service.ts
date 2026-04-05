import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

  /** Lấy danh sách thông báo của account (mới nhất trước) */
  async findByAccount(accountId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { account_id: accountId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  /** Đếm số thông báo chưa đọc */
  async countUnread(accountId: string): Promise<number> {
    return this.notifRepo.count({
      where: { account_id: accountId, is_read: false },
    });
  }

  /** Đánh dấu một thông báo đã đọc */
  async markAsRead(notifId: string, accountId: string): Promise<Notification> {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, account_id: accountId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.is_read = true;
    return this.notifRepo.save(notif);
  }

  /** Đánh dấu tất cả thông báo đã đọc */
  async markAllAsRead(accountId: string): Promise<void> {
    await this.notifRepo.update(
      { account_id: accountId, is_read: false },
      { is_read: true },
    );
  }

  /** Tạo thông báo chào mừng khi user đăng ký thành công */
  async createWelcomeNotification(event: UserRegisteredEvent): Promise<void> {
    const displayName = event.fullName || event.email;

    const notification = this.notifRepo.create({
      account_id: event.accountId,
      title: 'Chào mừng bạn đến MyNook!',
      message: `Xin chào ${displayName}! Cảm ơn bạn đã đăng ký tài khoản MyNook. Hãy bắt đầu khám phá những địa điểm tuyệt vời xung quanh bạn nhé!`,
      type: NotificationType.SYSTEM,
    });

    await this.notifRepo.save(notification);
    this.logger.log(`Welcome notification created for account ${event.accountId}`);
  }
}
