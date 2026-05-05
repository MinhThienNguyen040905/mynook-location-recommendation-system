import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewReport, ReportStatus } from '@mynook/database';
import { CreateReviewReportDto } from './dto/review-report.dto.js';
import { ReviewService } from '../review/review.service.js';

export interface ListReviewReportsQuery {
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReviewReportService {
  constructor(
    @InjectRepository(ReviewReport)
    private readonly reportRepo: Repository<ReviewReport>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly reviewService: ReviewService,
  ) {}

  async createReport(reporterId: string, dto: CreateReviewReportDto) {
    const review = await this.reviewRepo.findOne({
      where: { id: dto.review_id },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (review.account_id === reporterId) {
      throw new BadRequestException('Không thể report review của chính mình');
    }

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

  async list(query: ListReviewReportsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.reportRepo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [reports, total] = await qb.getManyAndCount();

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
      await this.reviewService.delete(report.review_id);

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
