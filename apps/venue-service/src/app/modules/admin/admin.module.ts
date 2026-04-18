import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from '@mynook/database';
import { AdminVenueController } from './admin.controller.js';
import { AdminVenueService } from './admin.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Venue])],
  controllers: [AdminVenueController],
  providers: [AdminVenueService],
})
export class AdminVenueModule {}
