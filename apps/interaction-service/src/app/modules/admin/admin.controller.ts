import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminInteractionService } from './admin.service.js';
import { BroadcastNotificationDto } from './dto/broadcast.dto.js';

@ApiTags('Admin — Interaction')
@Controller('admin/interaction')
export class AdminInteractionController {
  constructor(private readonly adminService: AdminInteractionService) {}

  @Get('reviews')
  @ApiOperation({ summary: 'Admin list reviews' })
  listReviews(
    @Query('venue_id') venueId?: string,
    @Query('account_id') accountId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listReviews({
      venue_id: venueId,
      account_id: accountId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Admin xóa review (ví dụ review giả mạo)' })
  deleteReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteReview(id);
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Gửi thông báo tổng đến nhiều accounts' })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.adminService.broadcast(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê interaction (reviews, favorites)' })
  stats() {
    return this.adminService.stats();
  }
}
