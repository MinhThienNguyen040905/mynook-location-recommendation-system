import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from '@mynook/database';
import { AdminVenueController } from './admin.controller.js';
import { AdminVenueService } from './admin.service.js';
import { CategoryModule } from '../category/category.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Venue]), CategoryModule],
  controllers: [AdminVenueController],
  providers: [AdminVenueService],
})
export class AdminVenueModule {}
