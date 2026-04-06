import { Controller, Get } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  getData() {
    return this.searchService.getData();
  }
}
