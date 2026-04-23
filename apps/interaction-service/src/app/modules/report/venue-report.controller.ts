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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { VenueReportStatus } from '@mynook/database';
import { VenueReportService } from './venue-report.service.js';
import {
  CreateVenueReportDto,
  UpdateVenueReportStatusDto,
} from './dto/venue-report.dto.js';

@ApiTags('Reports — Venue')
@Controller('venue-reports')
export class VenueReportController {
  constructor(private readonly service: VenueReportService) {}

  @Post()
  @ApiOperation({ summary: 'User report venue (giả mạo, sai thông tin, vi phạm)' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateVenueReportDto,
  ) {
    return this.service.create(user.id, dto);
  }

  /* ── Admin endpoints (gateway bảo vệ bằng AdminGuard) ── */

  @Get('admin')
  @ApiOperation({ summary: 'Admin list venue reports' })
  list(
    @Query('status') status?: VenueReportStatus,
    @Query('venue_id') venueId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      venue_id: venueId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Stats venue reports' })
  stats() {
    return this.service.stats();
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Chi tiết venue report' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch('admin/:id/status')
  @ApiOperation({
    summary:
      'Cập nhật status — dùng sau khi gateway đã gọi venue-service (deactivate) hoặc khi dismiss',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateVenueReportStatusDto,
  ) {
    return this.service.updateStatus(id, user.id, dto.status);
  }

  @Patch('admin/venue/:venueId/bulk-resolve')
  @ApiOperation({
    summary:
      'Bulk-mark tất cả report pending của một venue là resolved_deactivated',
  })
  bulkResolve(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.bulkResolveByVenue(
      venueId,
      user.id,
      VenueReportStatus.RESOLVED_DEACTIVATED,
    );
  }
}
