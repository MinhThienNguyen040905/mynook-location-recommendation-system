import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkSaveMenuItemDto {
  @ApiProperty({ example: 'Cà phê sữa đá' })
  name!: string;

  @ApiProperty({ example: 35000 })
  price!: number;

  @ApiPropertyOptional({ example: true })
  is_available?: boolean;
}

export class BulkSaveMenuCategoryDto {
  @ApiProperty({ example: 'Cà phê' })
  name!: string;

  @ApiPropertyOptional({ example: 0 })
  display_order?: number;

  @ApiProperty({ type: [BulkSaveMenuItemDto] })
  items!: BulkSaveMenuItemDto[];
}

export class BulkSaveMenuDto {
  @ApiProperty({ type: [BulkSaveMenuCategoryDto] })
  categories!: BulkSaveMenuCategoryDto[];

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  menu_image_url?: string;
}
