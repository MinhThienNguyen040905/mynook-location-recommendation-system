import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuthHeadersInterceptor)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của user' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  async getMyNotifications(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/notifications`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  async getUnreadCount(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/notifications/unread-count`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  @ApiResponse({ status: 200, description: 'Notification đã đọc' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${INTERACTION_SERVICE_URL}/notifications/${id}/read`,
        {},
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ApiResponse({ status: 200, description: 'Tất cả đã đọc' })
  async markAllAsRead(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${INTERACTION_SERVICE_URL}/notifications/read-all`,
        {},
        { headers: req.authHeaders },
      ),
    );
    return data;
  }
}
