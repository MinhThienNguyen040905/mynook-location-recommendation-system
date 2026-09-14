import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './search.controller.js';
import { VoiceController } from './voice.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [SearchController, VoiceController],
})
export class SearchModule {}
