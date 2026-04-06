import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from './interceptors/auth-headers.interceptor.js';

@ApiTags('Menu')
@Controller('venues/:venueId/menu')
export class MenuController {
  constructor(private readonly http: HttpService) {}

  private base(venueId: string) {
    return `${VENUE_SERVICE_URL}/venues/${venueId}/menu`;
  }

  /* ── Categories ──────────────────────────────────────── */

  @Get('categories')
  @ApiOperation({ summary: 'Lấy categories (kèm items) của venue' })
  async getCategories(@Param('venueId') venueId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.base(venueId)}/categories`),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post('categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo category mới' })
  async createCategory(
    @Param('venueId') venueId: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.base(venueId)}/categories`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Patch('categories/:categoryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật category' })
  async updateCategory(
    @Param('venueId') venueId: string,
    @Param('categoryId') categoryId: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${this.base(venueId)}/categories/${categoryId}`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Delete('categories/:categoryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa category' })
  async deleteCategory(
    @Param('venueId') venueId: string,
    @Param('categoryId') categoryId: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(
        `${this.base(venueId)}/categories/${categoryId}`,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  /* ── Items ───────────────────────────────────────────── */

  @Get('items')
  @ApiOperation({ summary: 'Lấy tất cả menu items của venue' })
  async getItems(@Param('venueId') venueId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.base(venueId)}/items`),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post('items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo menu item mới' })
  async createItem(
    @Param('venueId') venueId: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.base(venueId)}/items`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Patch('items/:itemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật menu item' })
  async updateItem(
    @Param('venueId') venueId: string,
    @Param('itemId') itemId: string,
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: unknown,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(
        `${this.base(venueId)}/items/${itemId}`,
        body,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Delete('items/:itemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa menu item' })
  async deleteItem(
    @Param('venueId') venueId: string,
    @Param('itemId') itemId: string,
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.delete(
        `${this.base(venueId)}/items/${itemId}`,
        { headers: req.authHeaders },
      ),
    );
    return data;
  }
}
