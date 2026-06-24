import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType, VenueReport, VenueReportStatus } from '@mynook/database';
import { CreateVenueReportDto } from './dto/venue-report.dto.js';
import { NotificationService } from '../notification/notification.service.js';

export interface ListVenueReportsQuery {
  status?: VenueReportStatus;
  venue_id?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class VenueReportService {
  constructor(
    @InjectRepository(VenueReport)
    private readonly repo: Repository<VenueReport>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(reporterId: string, dto: CreateVenueReportDto) {
    const existing = await this.repo.findOne({
      where: {
        venue_id: dto.venue_id,
        reporter_account_id: reporterId,
        status: VenueReportStatus.PENDING,
      },
    });
    if (existing) {
      await this.notifyAdminsNewVenueReport(existing);
      return existing;
    }

    const report = this.repo.create({
      venue_id: dto.venue_id,
      reporter_account_id: reporterId,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    const saved = await this.repo.save(report);
    await this.notifyAdminsNewVenueReport(saved);
    return saved;
  }

  async list(query: ListVenueReportsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.repo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.venue_id) qb.andWhere('r.venue_id = :vid', { vid: query.venue_id });

    const [data, total] = await qb.getManyAndCount();
    return { data, page, limit, total };
  }

  async findById(id: string) {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Venue report not found');
    return report;
  }

  async updateStatus(id: string, adminId: string, status: VenueReportStatus) {
    if (status === VenueReportStatus.PENDING) {
      throw new BadRequestException('Không thể đổi về PENDING');
    }
    const report = await this.findById(id);
    if (report.status !== VenueReportStatus.PENDING) {
      throw new BadRequestException('Report đã được xử lý');
    }
    report.status = status;
    report.resolved_by = adminId;
    report.resolved_at = new Date();
    const saved = await this.repo.save(report);

    await this.notifyVenueReportResolved([saved], status);
    return saved;
  }

  async bulkResolveByVenue(
    venueId: string,
    adminId: string,
    status: VenueReportStatus,
  ) {
    const pendingReports = await this.repo.find({
      where: {
        venue_id: venueId,
        status: VenueReportStatus.PENDING,
      },
    });

    const res = await this.repo
      .createQueryBuilder()
      .update(VenueReport)
      .set({ status, resolved_by: adminId, resolved_at: new Date() })
      .where('venue_id = :vid AND status = :pending', {
        vid: venueId,
        pending: VenueReportStatus.PENDING,
      })
      .execute();
    await this.notifyVenueReportResolved(pendingReports, status);
    return { affected: res.affected ?? 0 };
  }

  private async notifyVenueReportResolved(
    reports: VenueReport[],
    status: VenueReportStatus,
  ): Promise<void> {
    const accepted = status === VenueReportStatus.RESOLVED_DEACTIVATED;
    await this.notificationService.createManyForAccounts(
      reports.map((report) => ({
        accountId: report.reporter_account_id,
        title: accepted
          ? 'Báo cáo địa điểm của bạn đã được chấp nhận'
          : 'Báo cáo địa điểm của bạn đã được xem xét',
        message: accepted
          ? 'Cảm ơn bạn đã báo cáo. Địa điểm vi phạm đã được xử lý.'
          : 'Cảm ơn bạn đã báo cáo. Sau khi xem xét, chúng tôi chưa thấy cần vô hiệu hóa địa điểm này.',
        type: NotificationType.SYSTEM,
        relatedEntityId: report.id,
        relatedEntityType: this.buildVenueReportEntityType(report.venue_id),
      })),
    );
  }

  private async notifyAdminsNewVenueReport(report: VenueReport): Promise<void> {
    await this.notificationService.createForAdminsOnce({
      title: 'Có báo cáo venue mới',
      message: `Venue #${report.venue_id.slice(0, 8)} vừa bị báo cáo vì "${report.reason}".`,
      type: NotificationType.SYSTEM,
      relatedEntityId: report.id,
      relatedEntityType: this.buildVenueReportEntityType(report.venue_id),
    });
  }

  private buildVenueReportEntityType(venueId: string): string {
    return `venue_report:${venueId}`;
  }

  async stats() {
    const [total, pending, deactivated, dismissed] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: VenueReportStatus.PENDING } }),
      this.repo.count({
        where: { status: VenueReportStatus.RESOLVED_DEACTIVATED },
      }),
      this.repo.count({ where: { status: VenueReportStatus.DISMISSED } }),
    ]);
    return {
      total,
      pending,
      resolved_deactivated: deactivated,
      dismissed,
    };
  }
}
