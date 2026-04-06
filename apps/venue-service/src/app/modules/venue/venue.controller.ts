import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { VenueService } from './venue.service.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';

@ApiTags('Venues')
@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả venues đang active' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả venues' })
  getAllVenues() {
    return this.venueService.findAll();
  }

  @Get('owner')
  @ApiOperation({ summary: 'Lấy danh sách venues của owner đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Danh sách venues' })
  getMyVenues(@CurrentUser() user: CurrentUserPayload) {
    return this.venueService.findByOwner(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết venue theo ID' })
  @ApiResponse({ status: 200, description: 'Venue detail' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  getVenueById(@Param('id') id: string) {
    return this.venueService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo venue mới (owner)' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  createVenue(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venueService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật venue (owner sở hữu)' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  updateVenue(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venueService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa venue (soft delete)' })
  @ApiResponse({ status: 200, description: 'Venue deleted' })
  deleteVenue(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.venueService.remove(id, user.id);
  }
}
