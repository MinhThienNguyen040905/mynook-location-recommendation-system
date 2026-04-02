import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@mynook/shared-types';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ enum: [AccountType.CUSTOMER, AccountType.BUSINESS], example: AccountType.CUSTOMER })
  @IsEnum([AccountType.CUSTOMER, AccountType.BUSINESS])
  @IsOptional()
  type?: AccountType.CUSTOMER | AccountType.BUSINESS;
}
