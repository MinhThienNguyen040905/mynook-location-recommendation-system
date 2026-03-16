import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from './interceptors/auth-headers.interceptor.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly http: HttpService) {}

  @Post('register')
  async register(@Body() body: Record<string, unknown>) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/register`, body),
    );
    return data;
  }

  @Post('login')
  async login(@Body() body: Record<string, unknown>) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/login`, body),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('profile')
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
