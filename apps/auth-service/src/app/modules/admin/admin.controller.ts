import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountType } from '@mynook/shared-types';
import { AdminService } from './admin.service.js';
import { UpdateAccountStatusDto } from './dto/update-status.dto.js';

@ApiTags('Admin — Accounts')
@Controller('admin/accounts')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List accounts với filter + pagination' })
  @ApiResponse({ status: 200, description: 'Danh sách accounts' })
  list(
    @Query('type') type?: AccountType,
    @Query('is_active') isActive?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAccounts({
      type,
      is_active:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng accounts theo type/active' })
  stats() {
    return this.adminService.stats();
  }

  @Post('lookup')
  @ApiOperation({ summary: 'Lấy thông tin nhiều accounts theo danh sách id (internal)' })
  lookup(@Body() body: { ids: string[] }) {
    return this.adminService.findByIds(body.ids ?? []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một account' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Khóa/mở tài khoản (is_active)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.adminService.setActive(id, dto.is_active);
  }
}
