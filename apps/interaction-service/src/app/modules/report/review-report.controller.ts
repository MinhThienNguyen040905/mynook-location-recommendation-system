import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { ReportStatus } from '@mynook/database';
import { ReviewReportService } from './review-report.service.js';
import {
  CreateReviewReportDto,
  ResolveReviewReportDto,
} from './dto/review-report.dto.js';

@ApiTags('Reports — Review')
@Controller('reports')
export class ReviewReportController {
  constructor(private readonly service: ReviewReportService) {}

  @Post()
  @ApiOperation({ summary: 'Report một review vi phạm' })
  @ApiResponse({ status: 201, description: 'Report created' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReviewReportDto,
  ) {
    return this.service.createReport(user.id, dto);
  }

  /* ── Admin endpoints (gateway protects với AdminGuard) ── */

  @Get('admin')
  @ApiOperation({ summary: 'Admin list review reports' })
  list(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Thống kê review reports' })
  stats() {
    return this.service.stats();
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Chi tiết một review report' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch('admin/:id/resolve')
  @ApiOperation({ summary: 'Admin xử lý report — delete review hoặc dismiss' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveReviewReportDto,
  ) {
    return this.service.resolve(id, user.id, dto.action);
  }
}
