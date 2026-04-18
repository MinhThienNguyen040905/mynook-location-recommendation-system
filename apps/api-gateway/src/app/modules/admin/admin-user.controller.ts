import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Admin — Users')
@ApiBearerAuth()
@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminUserController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list accounts' })
  async list(
    @Request() req: { authHeaders: Record<string, string> },
    @Query() query: Record<string, string>,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/admin/accounts`, {
        headers: req.authHeaders,
        params: query,
      }),
    );
    return data;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê accounts' })
  async stats(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/admin/accounts/stats`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết account' })
  async get(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/admin/accounts/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Khóa / mở tài khoản' })
  async updateStatus(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: { is_active: boolean },
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${AUTH_SERVICE_URL}/admin/accounts/${id}/status`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }
}
