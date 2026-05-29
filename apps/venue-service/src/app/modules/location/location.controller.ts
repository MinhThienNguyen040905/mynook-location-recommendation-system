import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service.js';
import {
  CreateCityDto,
  UpdateCityDto,
  CreateDistrictDto,
  UpdateDistrictDto,
} from './dto/location.dto.js';

/**
 * Public + admin endpoints for location reference data (cities, districts).
 * AdminGuard is enforced at the api-gateway layer.
 */
@ApiTags('Locations')
@Controller()
export class LocationController {
  constructor(private readonly svc: LocationService) {}

  // ── Cities ───────────────────────────────────────────────────────

  @Get('cities')
  @ApiOperation({ summary: 'List active cities (public)' })
  listCities() {
    return this.svc.listCities(false);
  }

  @Get('cities/all')
  @ApiOperation({ summary: 'List all cities including inactive (admin)' })
  listAllCities() {
    return this.svc.listCities(true);
  }

  @Get('cities/:id')
  getCity(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findCityById(id);
  }

  @Post('cities')
  @ApiOperation({ summary: 'Create a city (admin)' })
  createCity(@Body() dto: CreateCityDto) {
    return this.svc.createCity(dto);
  }

  @Patch('cities/:id')
  updateCity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.svc.updateCity(id, dto);
  }

  @Delete('cities/:id')
  removeCity(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeCity(id);
  }

  // ── Districts ────────────────────────────────────────────────────

  @Get('districts')
  @ApiOperation({ summary: 'List districts (public, filter by city_id)' })
  @ApiQuery({ name: 'city_id', required: false })
  listDistricts(@Query('city_id') cityId?: string) {
    return this.svc.listDistricts(cityId, false);
  }

  @Get('districts/all')
  @ApiOperation({ summary: 'List all districts including inactive (admin)' })
  @ApiQuery({ name: 'city_id', required: false })
  listAllDistricts(@Query('city_id') cityId?: string) {
    return this.svc.listDistricts(cityId, true);
  }

  @Get('districts/:id')
  getDistrict(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findDistrictById(id);
  }

  @Post('districts')
  @ApiOperation({ summary: 'Create a district (admin)' })
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.svc.createDistrict(dto);
  }

  @Patch('districts/:id')
  updateDistrict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictDto,
  ) {
    return this.svc.updateDistrict(id, dto);
  }

  @Delete('districts/:id')
  removeDistrict(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeDistrict(id);
  }
}
