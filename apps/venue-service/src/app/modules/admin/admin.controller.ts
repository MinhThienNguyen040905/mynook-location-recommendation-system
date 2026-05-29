import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { AdminVenueService } from './admin.service.js';
import { CreateVenueDto } from '../venue/dto/create-venue.dto.js';
import { UpdateVenueDto } from '../venue/dto/update-venue.dto.js';

@ApiTags('Admin — Venues')
@Controller('admin/venues')
export class AdminVenueController {
  constructor(private readonly adminService: AdminVenueService) {}

  @Get()
  @ApiOperation({ summary: 'List tất cả venues (gồm cả inactive) — admin' })
  @ApiResponse({ status: 200, description: 'Danh sách venues phân trang' })
  list(
    @Query('is_active') isActive?: string,
    @Query('is_community_contributed') isCc?: string,
    @Query('city_id') cityId?: string,
    @Query('district_id') districtId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.list({
      is_active:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      is_community_contributed:
        isCc === 'true' ? true : isCc === 'false' ? false : undefined,
      city_id: cityId,
      district_id: districtId,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê venues (tổng, hot, khu vực phổ biến)' })
  stats() {
    return this.adminService.stats();
  }

  @Post('reindex-embeddings')
  @ApiOperation({
    summary: 'Sinh lại search_document + embedding cho venues thiếu (hoặc all nếu force=true)',
  })
  reindex(
    @Query('force') force?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.reindexEmbeddings(
      force === 'true' || force === '1',
      limit ? Number(limit) : 50,
    );
  }

  @Get('cities')
  @ApiOperation({ summary: 'Phân bố venue theo city' })
  cityBreakdown() {
    return this.adminService.cityBreakdown();
  }

  @Post()
  @ApiOperation({ summary: 'Admin tạo venue mới' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateVenueDto,
  ) {
    return this.adminService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin cập nhật bất kỳ venue nào' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.adminService.update(id, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục venue đã soft-delete' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete venue (set is_active = false)' })
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.softDelete(id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn venue khỏi DB' })
  hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.hardDelete(id);
  }
}
