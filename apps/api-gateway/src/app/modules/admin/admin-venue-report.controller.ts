import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  INTERACTION_SERVICE_URL,
  VENUE_SERVICE_URL,
} from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

type ResolveAction = 'deactivate' | 'dismiss';

@ApiTags('Admin — Venue Reports')
@ApiBearerAuth()
@Controller('admin/venue-reports')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminVenueReportController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list venue reports' })
  async list(
    @Request() req: { authHeaders: Record<string, string> },
    @Query() query: Record<string, string>,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/venue-reports/admin`, {
        headers: req.authHeaders,
        params: query,
      }),
    );
    return data;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Stats venue reports' })
  async stats(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/venue-reports/admin/stats`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết venue report' })
  async get(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${INTERACTION_SERVICE_URL}/venue-reports/admin/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  /**
   * Resolve report:
   *  - `deactivate`: gọi venue-service soft-delete venue → bulk-resolve tất cả pending reports của venue đó
   *  - `dismiss`: chỉ đổi status report này thành dismissed
   */
  @Patch(':id/resolve')
  @ApiOperation({
    summary:
      'Xử lý report — deactivate (vô hiệu venue + bulk-resolve) hoặc dismiss',
  })
  async resolve(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: { action: ResolveAction },
  ) {
    if (body.action !== 'deactivate' && body.action !== 'dismiss') {
      throw new BadRequestException('action phải là deactivate hoặc dismiss');
    }

    const headers = req.authHeaders;

    const { data: report } = await firstValueFrom(
      this.http.get<{ id: string; venue_id: string; status: string }>(
        `${INTERACTION_SERVICE_URL}/venue-reports/admin/${id}`,
        { headers },
      ),
    );

    if (body.action === 'dismiss') {
      const { data } = await firstValueFrom(
        this.http.patch(
          `${INTERACTION_SERVICE_URL}/venue-reports/admin/${id}/status`,
          { status: 'dismissed' },
          { headers },
        ),
      );
      return { resolved: data, deactivated_venue: false };
    }

    await firstValueFrom(
      this.http.delete(
        `${VENUE_SERVICE_URL}/admin/venues/${report.venue_id}`,
        { headers },
      ),
    );

    const { data: bulk } = await firstValueFrom(
      this.http.patch(
        `${INTERACTION_SERVICE_URL}/venue-reports/admin/venue/${report.venue_id}/bulk-resolve`,
        {},
        { headers },
      ),
    );

    return {
      deactivated_venue: true,
      venue_id: report.venue_id,
      reports_resolved: bulk.affected ?? 0,
    };
  }
}
