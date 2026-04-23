import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AUTH_SERVICE_URL } from "@mynook/shared-types";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { AuthHeadersInterceptor } from "../../common/interceptors/auth-headers.interceptor.js";
import {
  GatewayRegisterDto,
  GatewayLoginDto,
  GatewayRefreshTokenDto,
  GatewayForgotPasswordDto,
  GatewayResetPasswordDto,
  GatewayChangePasswordDto,
  GatewayUpdateProfileDto,
  GatewaySendOtpDto,
  GatewayVerifyOtpDto,
} from "./dto/auth.dto.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly http: HttpService) {}

  @Post("register")
  @ApiOperation({ summary: "Đăng ký tài khoản mới (user hoặc owner)" })
  @ApiResponse({
    status: 201,
    description: "Đăng ký thành công, trả về tokens + user info",
  })
  @ApiResponse({ status: 409, description: "Email đã được sử dụng" })
  async register(@Body() body: GatewayRegisterDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/register`, body),
    );
    return data;
  }

  @Post("send-otp")
  @ApiOperation({ summary: "Gửi OTP xác thực email trước khi đăng ký" })
  @ApiResponse({ status: 201, description: "OTP đã gửi đến email" })
  @ApiResponse({ status: 409, description: "Email đã được sử dụng" })
  async sendOtp(@Body() body: GatewaySendOtpDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/send-otp`, body),
    );
    return data;
  }

  @Post("verify-otp")
  @ApiOperation({ summary: "Xác thực OTP và hoàn tất đăng ký" })
  @ApiResponse({ status: 201, description: "Đăng ký thành công, trả về tokens + user info" })
  @ApiResponse({ status: 400, description: "OTP không hợp lệ hoặc đã hết hạn" })
  async verifyOtp(@Body() body: GatewayVerifyOtpDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/verify-otp`, body),
    );
    return data;
  }

  @Post("login")
  @ApiOperation({ summary: "Đăng nhập" })
  @ApiResponse({
    status: 201,
    description: "Đăng nhập thành công, trả về tokens + user info",
  })
  @ApiResponse({ status: 401, description: "Email hoặc mật khẩu không đúng" })
  async login(@Body() body: GatewayLoginDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/login`, body),
    );
    return data;
  }

  @Post("refresh")
  @ApiOperation({ summary: "Làm mới access token bằng refresh token" })
  @ApiResponse({
    status: 201,
    description: "Trả về cặp tokens mới (access_token + refresh_token)",
  })
  @ApiResponse({
    status: 401,
    description: "Refresh token không hợp lệ hoặc đã hết hạn",
  })
  async refresh(@Body() body: GatewayRefreshTokenDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/refresh`, body),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy thông tin profile của user đang đăng nhập" })
  @ApiResponse({ status: 200, description: "Trả về thông tin user" })
  @ApiResponse({
    status: 401,
    description: "Token không hợp lệ hoặc đã hết hạn",
  })
  async getProfile(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${AUTH_SERVICE_URL}/auth/profile`, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @Post("forgot-password")
  @ApiOperation({
    summary: "Quên mật khẩu — nhận reset token qua email (dev: trong response)",
  })
  @ApiResponse({
    status: 201,
    description: "Message xác nhận (dev: kèm dev_reset_token)",
  })
  async forgotPassword(@Body() body: GatewayForgotPasswordDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/forgot-password`, body),
    );
    return data;
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Đặt lại mật khẩu bằng reset token" })
  @ApiResponse({ status: 201, description: "Đặt lại mật khẩu thành công" })
  @ApiResponse({
    status: 400,
    description: "Token không hợp lệ hoặc đã hết hạn",
  })
  async resetPassword(@Body() body: GatewayResetPasswordDto) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/reset-password`, body),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Post("change-password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đổi mật khẩu (yêu cầu đăng nhập)" })
  @ApiResponse({ status: 201, description: "Đổi mật khẩu thành công" })
  @ApiResponse({
    status: 401,
    description: "Token hoặc mật khẩu hiện tại không đúng",
  })
  async changePassword(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayChangePasswordDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.post(`${AUTH_SERVICE_URL}/auth/change-password`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Patch("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật thông tin profile (yêu cầu đăng nhập)" })
  @ApiResponse({
    status: 200,
    description: "Trả về thông tin user đã cập nhật",
  })
  @ApiResponse({
    status: 401,
    description: "Token không hợp lệ hoặc đã hết hạn",
  })
  async updateProfile(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: GatewayUpdateProfileDto,
  ) {
    const { data } = await firstValueFrom(
      this.http.patch(`${AUTH_SERVICE_URL}/auth/profile`, body, {
        headers: req.authHeaders,
      }),
    );
    return data;
  }
}
