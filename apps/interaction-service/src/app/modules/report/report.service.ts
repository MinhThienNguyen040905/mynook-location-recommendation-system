import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewReport, ReportStatus } from '@mynook/database';
import { CreateReportDto } from './dto/create-report.dto.js';

export interface ListReportsQuery {
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ReviewReport)
    private readonly reportRepo: Repository<ReviewReport>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  /** User submits a report on a review */
  async createReport(reporterId: string, dto: CreateReportDto) {
    const review = await this.reviewRepo.findOne({
      where: { id: dto.review_id },
    });
    if (!review) throw new NotFoundException('Review not found');

    // Không cho report chính review của mình
    if (review.account_id === reporterId) {
      throw new BadRequestException('Không thể report review của chính mình');
    }

    // Nếu user đã report review này rồi (status pending) thì không tạo thêm
    const existing = await this.reportRepo.findOne({
      where: {
        review_id: dto.review_id,
        reporter_account_id: reporterId,
        status: ReportStatus.PENDING,
      },
    });
    if (existing) return existing;

    const report = this.reportRepo.create({
      review_id: dto.review_id,
      reporter_account_id: reporterId,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    return this.reportRepo.save(report);
  }

  /** Admin list reports + enrich review content */
  async list(query: ListReportsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.reportRepo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [reports, total] = await qb.getManyAndCount();

    // enrich với nội dung review
    const reviewIds = [...new Set(reports.map((r) => r.review_id))];
    const reviews = reviewIds.length
      ? await this.reviewRepo
          .createQueryBuilder('rv')
          .whereInIds(reviewIds)
          .getMany()
      : [];
    const reviewMap = new Map(reviews.map((rv) => [rv.id, rv]));

    return {
      data: reports.map((r) => ({
        ...r,
        review: reviewMap.get(r.review_id) ?? null,
      })),
      page,
      limit,
      total,
    };
  }

  async findById(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    const review = await this.reviewRepo.findOne({
      where: { id: report.review_id },
    });
    return { ...report, review };
  }

  /** Admin resolve report — either delete review hoặc dismiss */
  async resolve(
    reportId: string,
    adminId: string,
    action: 'delete' | 'dismiss',
  ) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report đã được xử lý');
    }

    if (action === 'delete') {
      await this.reviewRepo.delete(report.review_id);

      // Đánh dấu tất cả report cho review này là resolved_deleted
      await this.reportRepo
        .createQueryBuilder()
        .update(ReviewReport)
        .set({
          status: ReportStatus.RESOLVED_DELETED,
          resolved_by: adminId,
          resolved_at: new Date(),
        })
        .where('review_id = :rid AND status = :pending', {
          rid: report.review_id,
          pending: ReportStatus.PENDING,
        })
        .execute();
    } else {
      report.status = ReportStatus.DISMISSED;
      report.resolved_by = adminId;
      report.resolved_at = new Date();
      await this.reportRepo.save(report);
    }

    return this.findById(reportId);
  }

  async stats() {
    const [pending, deleted, dismissed, total] = await Promise.all([
      this.reportRepo.count({ where: { status: ReportStatus.PENDING } }),
      this.reportRepo.count({
        where: { status: ReportStatus.RESOLVED_DELETED },
      }),
      this.reportRepo.count({ where: { status: ReportStatus.DISMISSED } }),
      this.reportRepo.count(),
    ]);
    return { total, pending, resolved_deleted: deleted, dismissed };
  }
}
