import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { MenuService } from './menu.service.js';
import { MenuAnalyzeService } from './menu-analyze.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from './dto/menu.dto.js';
import { AnalyzeMenuImageDto } from './dto/analyze-menu.dto.js';
import { BulkSaveMenuDto } from './dto/bulk-save-menu.dto.js';

@ApiTags('Menu')
@Controller('venues/:venueId/menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly menuAnalyzeService: MenuAnalyzeService,
  ) {}

  /* ── Analyze & Bulk Save ─────────────────────────────── */

  @Post('analyze-image')
  @ApiOperation({ summary: 'Phân tích ảnh menu bằng AI (Groq Vision)' })
  @ApiResponse({ status: 200 })
  analyzeMenuImage(
    @Param('venueId') venueId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AnalyzeMenuImageDto,
  ) {
    // ownership check is implicit — only owners call this via gateway
    return this.menuAnalyzeService.analyzeMenuImage(dto.image_url);
  }

  @Post('bulk-save')
  @ApiOperation({ summary: 'Lưu hàng loạt menu (categories + items) từ kết quả AI' })
  @ApiResponse({ status: 201 })
  bulkSaveMenu(
    @Param('venueId') venueId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BulkSaveMenuDto,
  ) {
    return this.menuService.bulkSave(venueId, user.id, dto);
  }

  /* ── Categories ──────────────────────────────────────── */

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách categories (kèm items)' })
  @ApiResponse({ status: 200 })
  getCategories(@Param('venueId') venueId: string) {
    return this.menuService.getCategories(venueId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Tạo category mới' })
  @ApiResponse({ status: 201 })
  createCategory(
    @Param('venueId') venueId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menuService.createCategory(venueId, user.id, dto);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: 'Cập nhật category' })
  updateCategory(
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(categoryId, user.id, dto);
  }

  @Delete('categories/:categoryId')
  @ApiOperation({ summary: 'Xóa category (kèm items)' })
  deleteCategory(
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuService.deleteCategory(categoryId, user.id);
  }

  /* ── Items ───────────────────────────────────────────── */

  @Get('items')
  @ApiOperation({ summary: 'Lấy tất cả items của venue' })
  getItems(@Param('venueId') venueId: string) {
    return this.menuService.getItems(venueId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Tạo menu item mới' })
  @ApiResponse({ status: 201 })
  createItem(
    @Param('venueId') venueId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createItem(venueId, user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Cập nhật menu item' })
  updateItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(itemId, user.id, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Xóa menu item' })
  deleteItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuService.deleteItem(itemId, user.id);
  }
}
