import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
