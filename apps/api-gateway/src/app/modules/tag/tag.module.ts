import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TagController } from './tag.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [TagController],
})
export class TagModule {}
