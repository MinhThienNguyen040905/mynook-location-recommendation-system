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
import { ReportService } from './report.service.js';
import {
  CreateReportDto,
  ResolveReportDto,
} from './dto/create-report.dto.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /** User submits a report */
  @Post()
  @ApiOperation({ summary: 'Report một review vi phạm' })
  @ApiResponse({ status: 201, description: 'Report created' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.createReport(user.id, dto);
  }

  /* ── Admin endpoints (gateway protects với AdminGuard) ── */

  @Get('admin')
  @ApiOperation({ summary: 'Admin list reports' })
  list(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportService.list({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Thống kê reports' })
  stats() {
    return this.reportService.stats();
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Chi tiết một report' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportService.findById(id);
  }

  @Patch('admin/:id/resolve')
  @ApiOperation({ summary: 'Admin xử lý report — delete review hoặc dismiss' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportService.resolve(id, user.id, dto.action);
  }
}
