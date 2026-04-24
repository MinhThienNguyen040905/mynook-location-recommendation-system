import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City, District } from '@mynook/database';
import { LocationController } from './location.controller.js';
import { LocationService } from './location.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([City, District])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
