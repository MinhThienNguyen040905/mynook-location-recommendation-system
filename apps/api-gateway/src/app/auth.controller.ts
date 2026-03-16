import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_URL } from '@mynook/shared-types';

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

  @Get('profile')
  async getProfile(@Headers('authorization') auth: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/auth/profile`, {
        headers: { authorization: auth },
      }),
    );
    return data;
  }
}
