import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({ example: 'HCM' })
  code!: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  name!: string;

  @ApiPropertyOptional({ example: ['hcm', 'tphcm', 'saigon'] })
  aliases?: string[];

  @ApiPropertyOptional({ example: 10.7769 })
  latitude?: number;

  @ApiPropertyOptional({ example: 106.7009 })
  longitude?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class UpdateCityDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  aliases?: string[];

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class CreateDistrictDto {
  @ApiProperty()
  city_id!: string;

  @ApiProperty({ example: 'Q1' })
  code!: string;

  @ApiProperty({ example: 'Quận 1' })
  name!: string;

  @ApiPropertyOptional({ example: ['q1', 'quan 1', 'district 1'] })
  aliases?: string[];

  @ApiPropertyOptional({ example: 10.7770 })
  latitude?: number;

  @ApiPropertyOptional({ example: 106.7010 })
  longitude?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class UpdateDistrictDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  aliases?: string[];

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}
