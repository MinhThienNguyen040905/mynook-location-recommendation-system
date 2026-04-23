import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeMenuImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../menu.jpg' })
  image_url!: string;
}

export interface AnalyzedMenuItem {
  name: string;
  price: number;
}

export interface AnalyzedMenuCategory {
  name: string;
  items: AnalyzedMenuItem[];
}

export interface AnalyzeMenuImageResult {
  categories: AnalyzedMenuCategory[];
}
