import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from './interceptors/auth-headers.interceptor.js';
import {
  GatewayRegisterDto,
  GatewayLoginDto,
  GatewayRefreshTokenDto,
} from './dto/auth.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly http: HttpService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về tokens + user info' })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  async register(@Body() body: GatewayRegisterDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/register`, body),
    );
    return data;
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiResponse({ status: 201, description: 'Đăng nhập thành công, trả về tokens + user info' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  async login(@Body() body: GatewayLoginDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/login`, body),
    );
    return data;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiResponse({ status: 201, description: 'Trả về cặp tokens mới (access_token + refresh_token)' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refresh(@Body() body: GatewayRefreshTokenDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/refresh`, body),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin profile của user đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  async getProfile(
    @Request() req: { authHeaders: Record<string, string> },
  ) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/auth/profile`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
