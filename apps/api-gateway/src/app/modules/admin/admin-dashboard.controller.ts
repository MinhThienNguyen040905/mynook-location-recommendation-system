import {
  Controller,
  Get,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_SERVICE_URL,
  INTERACTION_SERVICE_URL,
  VENUE_SERVICE_URL,
} from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminDashboardController {
  constructor(private readonly http: HttpService) {}

  /**
   * Tổng hợp thống kê toàn hệ thống (gọi song song các microservices).
   * Trả về dashboard payload với users, venues, interactions, reports.
   */
  @Get()
  @ApiOperation({ summary: 'Dashboard stats — tổng user, venue, hot venues, areas, reports' })
  async overview(@Request() req: { authHeaders: Record<string, string> }) {
    const headers = req.authHeaders;

    const [accounts, venues, interaction, reports] = await Promise.all([
      this.safeGet(`${AUTH_SERVICE_URL}/admin/accounts/stats`, headers),
      this.safeGet(`${VENUE_SERVICE_URL}/admin/venues/stats`, headers),
      this.safeGet(`${INTERACTION_SERVICE_URL}/admin/interaction/stats`, headers),
      this.safeGet(
        `${INTERACTION_SERVICE_URL}/reports/admin/stats`,
        headers,
      ),
    ]);

    return {
      accounts,
      venues,
      interaction,
      reports,
      generated_at: new Date().toISOString(),
    };
  }

  private async safeGet(url: string, headers: Record<string, string>) {
    try {
      const { data } = await firstValueFrom(this.http.get(url, { headers }));
      return data;
    } catch (err) {
      return { error: (err as Error).message };
    }
  }
}
