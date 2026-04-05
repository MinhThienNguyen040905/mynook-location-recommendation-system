import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'The Quiet Corner' })
  name?: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 1' })
  branch_name?: string;

  @ApiPropertyOptional({ example: 'Quán cà phê yên tĩnh' })
  description?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM' })
  address?: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh' })
  city?: string;

  @ApiPropertyOptional({ example: 'Quận 1' })
  district?: string;

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

  @ApiPropertyOptional()
  opening_hours?: unknown;

  @ApiPropertyOptional()
  owner_amenities?: unknown;
}
