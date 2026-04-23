import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SEARCH_AI_SERVICE_URL } from '@mynook/shared-types';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags (public)' })
  @ApiResponse({ status: 200, description: 'Array of tags' })
  async findAll() {
    const { data } = await firstValueFrom(
      this.http.get(`${SEARCH_AI_SERVICE_URL}/tags`),
    );
    return data;
  }
}
