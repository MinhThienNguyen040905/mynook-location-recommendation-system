import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Account } from '@mynook/database';
import { AccountType } from '@mynook/shared-types';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Account)
    private readonly userRepo: Repository<Account>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepo.create({
      email: dto.email,
      password_hash,
      full_name: dto.full_name || null,
      phone_number: dto.phone_number || null,
      type: dto.type ?? AccountType.CUSTOMER,
    });

    const saved = await this.userRepo.save(user);
    return this.buildResponse(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    return this.buildResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    return this.sanitizeUser(user);
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refresh_token, {
        secret: process.env['JWT_REFRESH_SECRET'] || 'mynook-refresh-dev-secret',
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User không tồn tại hoặc đã bị vô hiệu hóa');
      }

      return this.buildTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Quên mật khẩu — tạo reset token và lưu vào DB.
   * Dev mode: trả token thẳng trong response.
   * Production: gửi email chứa token (cần tích hợp mail service).
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Luôn trả 200 dù email không tồn tại để tránh user enumeration
    if (!user || !user.is_active) {
      return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.' };
    }

    // Tạo raw token (32 bytes hex) và hash trước khi lưu
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.password_reset_token = hashedToken;
    user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ
    await this.userRepo.save(user);

    // TODO (production): gửi email chứa link reset: /reset-password?token=<rawToken>
    console.log(`[AUTH] Password reset token for ${dto.email}: ${rawToken}`);

    const isDev = (process.env['NODE_ENV'] ?? 'development') !== 'production';
    return {
      message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      ...(isDev && { dev_reset_token: rawToken }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.userRepo.findOne({
      where: { password_reset_token: hashedToken },
    });

    if (!user || !user.password_reset_expires || user.password_reset_expires < new Date()) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(dto.new_password, salt);
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await this.userRepo.save(user);

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.password_hash) {
      throw new NotFoundException('User không tồn tại');
    }

    const isMatch = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(dto.new_password, salt);
    await this.userRepo.save(user);

    return { message: 'Đổi mật khẩu thành công.' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.phone_number !== undefined) user.phone_number = dto.phone_number;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  private buildResponse(user: Account) {
    return {
      ...this.buildTokens(user),
      user: this.sanitizeUser(user),
    };
  }

  private buildTokens(user: Account) {
    const payload = { sub: user.id, email: user.email, type: user.type };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, {
        secret: process.env['JWT_REFRESH_SECRET'] || 'mynook-refresh-dev-secret',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') as any,
      }),
    };
  }

  private sanitizeUser(user: Account) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      phone_number: user.phone_number,
      type: user.type,
      trust_score: user.trust_score,
      created_at: user.created_at,
    };
  }
}
