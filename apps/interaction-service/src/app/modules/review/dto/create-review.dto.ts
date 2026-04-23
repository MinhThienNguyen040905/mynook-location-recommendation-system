import { IsUUID, IsInt, Min, Max, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID của venue' })
  @IsUUID()
  venue_id!: string;

  @ApiProperty({ description: 'Điểm đánh giá (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Nội dung bình luận' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Danh sách URL media', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];
}
