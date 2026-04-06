import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';
import {
  GatewayCreateVenueDto,
  GatewayUpdateVenueDto,
} from './dto/venue.dto.js';

@ApiTags('Venues')
@Controller('venues')
export class VenueController {
  constructor(private readonly http: HttpService) {}

  /** Lấy danh sách venues của owner đang đăng nhập */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('owner/my-venues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách venues của owner đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Danh sách venues' })
  async getMyVenues(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/venues/owner`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  /** Lấy chi tiết venue theo ID */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết venue theo ID' })
  @ApiResponse({ status: 200, description: 'Venue detail' })
  async getVenueById(@Param('id') id: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/venues/${id}`),
    );
    return data;
  }

  /** Tạo venue mới (owner) */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo venue mới (owner)' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  async createVenue(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayCreateVenueDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/venues`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  /** Cập nhật venue (owner sở hữu) */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật venue' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  async updateVenue(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayUpdateVenueDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${VENUE_SERVICE_URL}/venues/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  /** Xóa venue (soft delete) */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa venue (soft delete)' })
  @ApiResponse({ status: 200, description: 'Venue deleted' })
  async deleteVenue(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/venues/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
