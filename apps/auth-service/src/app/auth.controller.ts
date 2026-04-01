import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '@mynook/shared-types';
import type { CurrentUserPayload } from '@mynook/shared-types';
import { AuthService } from './auth.service.js';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (user hoặc owner)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về tokens + user info' })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiResponse({ status: 201, description: 'Đăng nhập thành công, trả về tokens + user info' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiResponse({ status: 201, description: 'Trả về cặp tokens mới' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin profile (internal — nhận user từ headers)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.id);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Quên mật khẩu — gửi token reset' })
  @ApiResponse({ status: 201, description: 'Trả về message (dev: kèm dev_reset_token)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng reset token' })
  @ApiResponse({ status: 201, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc đã hết hạn' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu (yêu cầu đăng nhập — nhận user từ headers)' })
  @ApiResponse({ status: 201, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 401, description: 'Mật khẩu hiện tại không đúng' })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật profile (yêu cầu đăng nhập — nhận user từ headers)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user đã cập nhật' })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
