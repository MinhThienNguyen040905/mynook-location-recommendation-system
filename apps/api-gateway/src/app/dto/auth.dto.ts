import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@mynook/shared-types';

export class GatewayRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  password!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  full_name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone_number?: string;

  @ApiPropertyOptional({ enum: [AccountType.CUSTOMER, AccountType.BUSINESS], example: AccountType.CUSTOMER })
  type?: AccountType.CUSTOMER | AccountType.BUSINESS;
}

export class GatewayLoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  password!: string;
}

export class GatewayRefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token!: string;
}

export class GatewayForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}

export class GatewayResetPasswordDto {
  @ApiProperty({ description: 'Token nhận từ email hoặc dev_reset_token trong response' })
  token!: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  new_password!: string;
}

export class GatewayChangePasswordDto {
  @ApiProperty({ example: 'oldpassword123' })
  old_password!: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  new_password!: string;
}

export class GatewayUpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  full_name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone_number?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  avatar_url?: string;
}
