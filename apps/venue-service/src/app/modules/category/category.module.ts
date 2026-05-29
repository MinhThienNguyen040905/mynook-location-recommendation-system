import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, VenueCategory } from '@mynook/database';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, VenueCategory])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
