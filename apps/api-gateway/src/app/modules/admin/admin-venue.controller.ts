import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';
import {
  GatewayCreateVenueDto,
  GatewayUpdateVenueDto,
} from '../venue/dto/venue.dto.js';

@ApiTags('Admin — Venues')
@ApiBearerAuth()
@Controller('admin/venues')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminVenueController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list venues (gồm cả inactive)' })
  async list(
    @Request() req: { authHeaders: Record<string, string> },
    @Query() query: Record<string, string>,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/admin/venues`, {
        headers: req.authHeaders,
        params: query,
      }),
    );
    return data;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê venues' })
  async stats(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/admin/venues/stats`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post('reindex-embeddings')
  @ApiOperation({ summary: 'Sinh lại embedding cho venues thiếu (bulk)' })
  async reindex(
    @Request() req: { authHeaders: Record<string, string> },
    @Query('force') force?: string,
    @Query('limit') limit?: string,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${VENUE_SERVICE_URL}/admin/venues/reindex-embeddings`,
        {},
        {
          headers: req.authHeaders,
          params: { force, limit },
        },
      ),
    );
    return data;
  }

  @Get('cities')
  @ApiOperation({ summary: 'Phân bố venues theo city' })
  async cities(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/admin/venues/cities`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post()
  @ApiOperation({ summary: 'Admin tạo venue mới' })
  async create(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayCreateVenueDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/admin/venues`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin cập nhật bất kỳ venue nào' })
  async update(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayUpdateVenueDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${VENUE_SERVICE_URL}/admin/venues/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục venue đã bị soft-delete' })
  async restore(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${VENUE_SERVICE_URL}/admin/venues/${id}/restore`,
        {},
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin soft-delete venue' })
  async softDelete(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/admin/venues/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn venue' })
  async hardDelete(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/admin/venues/${id}/hard`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
