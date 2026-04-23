import {
  Body,
  Controller,
  Delete,
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
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Admin — Reviews & Reports')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminReviewController {
  constructor(private readonly http: HttpService) {}

  /* ── Reviews ── */

  @Get('reviews')
  @ApiOperation({ summary: 'Admin list reviews' })
  async listReviews(
    @Request() req: { authHeaders: Record<string, string> },
    @Query() query: Record<string, string>,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/admin/interaction/reviews`, {
        headers: req.authHeaders,
        params: query,
      }),
    );
    return data;
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Admin xóa review' })
  async deleteReview(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(
        `${INTERACTION_SERVICE_URL}/admin/interaction/reviews/${id}`,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  /* ── Reports ── */

  @Get('reports')
  @ApiOperation({ summary: 'Admin list reports' })
  async listReports(
    @Request() req: { authHeaders: Record<string, string> },
    @Query() query: Record<string, string>,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/reports/admin`, {
        headers: req.authHeaders,
        params: query,
      }),
    );
    return data;
  }

  @Get('reports/stats')
  @ApiOperation({ summary: 'Thống kê reports' })
  async reportStats(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/reports/admin/stats`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Chi tiết report' })
  async getReport(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/reports/admin/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Xử lý report — action: delete | dismiss' })
  async resolveReport(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: { action: 'delete' | 'dismiss' },
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${INTERACTION_SERVICE_URL}/reports/admin/${id}/resolve`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }
}
