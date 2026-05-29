import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

@ApiTags('Admin — Categories')
@ApiBearerAuth()
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminCategoryController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (active + inactive)' })
  async listAll(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/categories/all`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post()
  @ApiOperation({ summary: 'Create a venue category' })
  async create(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/categories`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a venue category' })
  async update(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${VENUE_SERVICE_URL}/categories/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a venue category' })
  async remove(
    @Param('id') id: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(`${VENUE_SERVICE_URL}/categories/${id}`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
