import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/* ── Category DTOs ─────────────────────────────────────── */

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cà phê' })
  name!: string;

  @ApiPropertyOptional({ example: 0 })
  display_order?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Trà' })
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;
}

/* ── Menu Item DTOs ────────────────────────────────────── */

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Cà phê sữa đá' })
  name!: string;

  @ApiProperty({ example: 35000 })
  price!: number;

  @ApiProperty({ example: '<category-uuid>' })
  category_id!: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  image_url?: string;

  @ApiPropertyOptional({ example: true })
  is_available?: boolean;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 'Cà phê đen' })
  name?: string;

  @ApiPropertyOptional({ example: 40000 })
  price?: number;

  @ApiPropertyOptional({ example: '<category-uuid>' })
  category_id?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  image_url?: string;

  @ApiPropertyOptional({ example: true })
  is_available?: boolean;
}
