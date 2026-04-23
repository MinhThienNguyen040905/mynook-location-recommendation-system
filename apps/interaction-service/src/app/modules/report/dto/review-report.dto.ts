import {
  IsUUID,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewReportDto {
  @ApiProperty({ description: 'ID của review bị report' })
  @IsUUID()
  review_id!: string;

  @ApiProperty({
    description: 'Lý do report (spam, offensive, fake, ...)',
    example: 'spam',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  reason!: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết thêm' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ResolveReviewReportDto {
  @ApiProperty({
    description: 'Hành động: delete = xóa review, dismiss = bỏ qua',
    enum: ['delete', 'dismiss'],
  })
  @IsString()
  action!: 'delete' | 'dismiss';
}
