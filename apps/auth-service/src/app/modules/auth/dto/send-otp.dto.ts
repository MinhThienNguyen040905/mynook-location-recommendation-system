import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@mynook/shared-types';

export class SendOtpDto {
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

  @ApiPropertyOptional({ enum: [AccountType.CUSTOMER, AccountType.OWNER], example: AccountType.CUSTOMER })
  @IsEnum([AccountType.CUSTOMER, AccountType.OWNER])
  @IsOptional()
  type?: AccountType.CUSTOMER | AccountType.OWNER;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số' })
  @IsString()
  otp!: string;
}
