import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ example: 'The Quiet Corner' })
  name!: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 1' })
  branch_name?: string;

  @ApiPropertyOptional({ example: 'Quán cà phê yên tĩnh, lý tưởng cho làm việc' })
  description?: string;

  @ApiProperty({ example: '123 Nguyễn Huệ', description: 'Street-level address only' })
  address_line!: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  ward?: string;

  @ApiProperty({
    description: 'UUID of the city (from GET /cities)',
    example: '11111111-2222-3333-4444-555555555555',
  })
  city_id!: string;

  @ApiProperty({
    description: 'UUID of the district (from GET /districts?city_id=...)',
    example: '11111111-2222-3333-4444-555555555555',
  })
  district_id!: string;

  @ApiProperty({ example: 10.7769 })
  latitude!: number;

  @ApiProperty({ example: 106.7009 })
  longitude!: number;

  @ApiPropertyOptional({ example: 50 })
  total_capacity?: number;

  @ApiPropertyOptional({ example: 10 })
  max_group_size?: number;

  @ApiPropertyOptional({ example: false })
  is_group_friendly?: boolean;

  @ApiPropertyOptional({ example: [] })
  media?: unknown[];

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../menu.jpg' })
  menu_image_url?: string;

  @ApiPropertyOptional()
  opening_hours?: unknown;

  @ApiPropertyOptional({
    type: [String],
    description: 'Category IDs (M:N). First becomes primary unless primary_category_id is provided.',
  })
  category_ids?: string[];

  @ApiPropertyOptional()
  primary_category_id?: string;
}
