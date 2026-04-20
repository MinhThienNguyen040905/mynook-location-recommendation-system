import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagService } from './tag.service.js';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({ status: 200, description: 'Array of tags' })
  async findAll() {
    const tags = await this.tagService.findAll();
    return { tags, total: tags.length };
  }
}
