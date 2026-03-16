import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  password!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  full_name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone_number?: string;
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
