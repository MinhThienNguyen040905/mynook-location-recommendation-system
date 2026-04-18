import {
  IsUUID,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueReportStatus } from '@mynook/database';

export class CreateVenueReportDto {
  @ApiProperty({ description: 'ID venue bị report' })
  @IsUUID()
  venue_id!: string;

  @ApiProperty({
    description:
      'Lý do report (fake, wrong_info, offensive, closed, duplicate, ...)',
    example: 'fake',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  reason!: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateVenueReportStatusDto {
  @ApiProperty({
    enum: VenueReportStatus,
    description: 'Trạng thái mới (resolved_deactivated / dismissed)',
  })
  @IsEnum(VenueReportStatus)
  status!: VenueReportStatus;
}
