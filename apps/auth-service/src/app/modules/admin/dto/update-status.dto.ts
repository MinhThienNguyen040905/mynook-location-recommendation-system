import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAccountStatusDto {
  @ApiProperty({ description: 'true = kích hoạt, false = khóa tài khoản' })
  @IsBoolean()
  is_active!: boolean;
}
