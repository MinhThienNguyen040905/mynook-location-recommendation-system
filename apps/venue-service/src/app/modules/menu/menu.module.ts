import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Venue, MenuCategory, MenuItem } from '@mynook/database';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { MenuAnalyzeService } from './menu-analyze.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue, MenuCategory, MenuItem]),
    HttpModule,
  ],
  controllers: [MenuController],
  providers: [MenuService, MenuAnalyzeService],
  exports: [MenuService, MenuAnalyzeService],
})
export class MenuModule {}
