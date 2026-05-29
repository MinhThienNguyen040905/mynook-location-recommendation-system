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
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Admin — Locations')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminLocationController {
  constructor(private readonly http: HttpService) {}

  // ── Cities ───────────────────────────────────────────────────────

  @Get('cities')
  @ApiOperation({ summary: 'List all cities (active + inactive)' })
  async listCities(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/cities/all`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post('cities')
  async createCity(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/cities`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch('cities/:id')
  async updateCity(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${VENUE_SERVICE_URL}/cities/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Delete('cities/:id')
  async removeCity(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/cities/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  // ── Districts ────────────────────────────────────────────────────

  @Get('districts')
  @ApiQuery({ name: 'city_id', required: false })
  async listDistricts(
    @Request() req: { authHeaders: Record<string, string> },
    @Query('city_id') cityId?: string,
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/districts/all`, {
        headers: req.authHeaders,
        params: cityId ? { city_id: cityId } : {},
      }),
    );
    return data;
  }

  @Post('districts')
  async createDistrict(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/districts`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch('districts/:id')
  async updateDistrict(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${VENUE_SERVICE_URL}/districts/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Delete('districts/:id')
  async removeDistrict(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/districts/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
