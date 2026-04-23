import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ example: 'The Quiet Corner' })
  name!: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 1' })
  branch_name?: string;

  @ApiPropertyOptional({ example: 'Quán cà phê yên tĩnh, lý tưởng cho làm việc' })
  description?: string;

  @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM' })
  address!: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh' })
  city?: string;

  @ApiPropertyOptional({ example: 'Quận 1' })
  district?: string;

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
}
