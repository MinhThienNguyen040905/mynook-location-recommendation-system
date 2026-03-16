import { Controller, Post, Get, Body } from '@nestjs/common';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.id);
  }
}
