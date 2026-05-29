import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'cafe', description: 'Stable snake_case key' })
  key!: string;

  @ApiProperty({ example: 'Quán cà phê' })
  display_name!: string;

  @ApiPropertyOptional({
    example: ['coffee', 'caphe', 'coffeeshop'],
    description: 'VN/EN synonyms to help the AI map free-text queries to this category',
  })
  synonyms?: string[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10 })
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  is_active?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  display_name?: string;

  @ApiPropertyOptional()
  synonyms?: string[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  display_order?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}
