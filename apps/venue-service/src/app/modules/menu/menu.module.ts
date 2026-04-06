import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue, MenuCategory, MenuItem } from '@mynook/database';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Venue, MenuCategory, MenuItem])],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
