import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';

/** Public read-only proxy for venue categories. */
@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'List active venue categories' })
  async listActive() {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/categories`),
    );
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  async getById(@Param('id') id: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${VENUE_SERVICE_URL}/categories/${id}`),
    );
    return data;
  }
}
