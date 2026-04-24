import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'The Quiet Corner' })
  name?: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 1' })
  branch_name?: string;

  @ApiPropertyOptional({ example: 'Quán cà phê yên tĩnh' })
  description?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ' })
  address_line?: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  ward?: string;

  @ApiPropertyOptional()
  city_id?: string;

  @ApiPropertyOptional()
  district_id?: string;

  @ApiPropertyOptional({ example: 10.7769 })
  latitude?: number;

  @ApiPropertyOptional({ example: 106.7009 })
  longitude?: number;

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
    description: 'Replace the venue categories. Send empty array to clear.',
  })
  category_ids?: string[];

  @ApiPropertyOptional()
  primary_category_id?: string;
}
