import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';

/**
 * Public read-only proxy for cities / districts.
 * Admin CRUD lives in admin/admin-location.controller.ts.
 */
@ApiTags('Locations')
@Controller()
export class LocationController {
  constructor(private readonly http: HttpService) {}

  @Get('cities')
  @ApiOperation({ summary: 'List active cities' })
  async listCities() {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/cities`),
    );
    return data;
  }

  @Get('cities/:id')
  async getCity(@Param('id') id: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/cities/${id}`),
    );
    return data;
  }

  @Get('districts')
  @ApiOperation({ summary: 'List districts (filter by city_id)' })
  @ApiQuery({ name: 'city_id', required: false })
  async listDistricts(@Query('city_id') cityId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/districts`, {
        params: cityId ? { city_id: cityId } : {},
      }),
    );
    return data;
  }

  @Get('districts/:id')
  async getDistrict(@Param('id') id: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/districts/${id}`),
    );
    return data;
  }
}
