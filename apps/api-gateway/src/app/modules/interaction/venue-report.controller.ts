import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Venue Reports')
@Controller('venue-reports')
export class VenueReportController {
  constructor(private readonly http: HttpService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report venue giả mạo / vi phạm' })
  async create(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: { venue_id: string; reason: string; description?: string },
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${INTERACTION_SERVICE_URL}/venue-reports`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
