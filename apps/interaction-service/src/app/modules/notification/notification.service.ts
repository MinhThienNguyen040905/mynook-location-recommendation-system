import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Account, AccountType, Notification, NotificationType } from '@mynook/database';
import type { UserRegisteredEvent } from '@mynook/shared-types';

export interface CreateNotificationInput {
  accountId: string;
  title: string;
  message: string;
  type?: NotificationType;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async findByAccount(accountId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { account_id: accountId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async countUnread(accountId: string): Promise<number> {
    return this.notifRepo.count({
      where: { account_id: accountId, is_read: false },
    });
  }

  async markAsRead(notifId: string, accountId: string): Promise<Notification> {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, account_id: accountId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.is_read = true;
    return this.notifRepo.save(notif);
  }

  async markAllAsRead(accountId: string): Promise<void> {
    await this.notifRepo.update(
      { account_id: accountId, is_read: false },
      { is_read: true },
    );
  }

  async createForAccount(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notifRepo.create({
      account_id: input.accountId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.SYSTEM,
      related_entity_id: input.relatedEntityId ?? null,
      related_entity_type: input.relatedEntityType ?? null,
    });

    return this.notifRepo.save(notification);
  }

  async createManyForAccounts(inputs: CreateNotificationInput[]): Promise<number> {
    const rows = inputs
      .filter((input) => input.accountId)
      .map((input) => ({
        account_id: input.accountId,
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.SYSTEM,
        related_entity_id: input.relatedEntityId ?? null,
        related_entity_type: input.relatedEntityType ?? null,
      }));

    if (rows.length === 0) return 0;

    const res = await this.notifRepo.insert(rows);
    return res.identifiers.length;
  }

  async createForAdmins(
    input: Omit<CreateNotificationInput, 'accountId'>,
  ): Promise<number> {
    const adminIds = await this.findActiveAdminAccountIds();

    return this.createManyForAccounts(
      adminIds.map((accountId) => ({
        ...input,
        accountId,
      })),
    );
  }

  async createForAdminsOnce(
    input: Omit<CreateNotificationInput, 'accountId'>,
  ): Promise<number> {
    const adminIds = await this.findActiveAdminAccountIds();
    if (adminIds.length === 0) return 0;

    if (!input.relatedEntityId || !input.relatedEntityType) {
      return this.createManyForAccounts(
        adminIds.map((accountId) => ({ ...input, accountId })),
      );
    }

    const existing = await this.notifRepo.find({
      select: { account_id: true },
      where: {
        account_id: In(adminIds),
        related_entity_id: input.relatedEntityId,
        related_entity_type: input.relatedEntityType,
      },
    });
    const notifiedAdminIds = new Set(
      existing.map((notification) => notification.account_id),
    );

    return this.createManyForAccounts(
      adminIds
        .filter((accountId) => !notifiedAdminIds.has(accountId))
        .map((accountId) => ({ ...input, accountId })),
    );
  }

  private async findActiveAdminAccountIds(): Promise<string[]> {
    const admins = await this.accountRepo.find({
      select: { id: true },
      where: { type: AccountType.ADMIN, is_active: true },
    });

    return admins.map((admin) => admin.id);
  }

  async createWelcomeNotification(event: UserRegisteredEvent): Promise<void> {
    const displayName = event.fullName || event.email;

    await this.createForAccount({
      accountId: event.accountId,
      title: 'Chào mừng bạn đến MyNook!',
      message: `Xin chào ${displayName}! Cảm ơn bạn đã đăng ký tài khoản MyNook. Hãy bắt đầu khám phá những địa điểm tuyệt vời xung quanh bạn nhé!`,
      type: NotificationType.SYSTEM,
    });

    this.logger.log(`Welcome notification created for account ${event.accountId}`);
  }
}
