import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { Account, RegistrationOtp } from '@mynook/database';
import { AccountType, RMQ_EVENTS } from '@mynook/shared-types';
import type { UserRegisteredEvent } from '@mynook/shared-types';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto.js';

@Injectable()
export class AuthService {
  private readonly mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(Account)
    private readonly userRepo: Repository<Account>,
    @InjectRepository(RegistrationOtp)
    private readonly otpRepo: Repository<RegistrationOtp>,
    private readonly jwtService: JwtService,
    @Inject('INTERACTION_SERVICE')
    private readonly interactionClient: ClientProxy,
  ) {
    this.mailer = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: Number(process.env['SMTP_PORT'] || 587),
      secure: false,
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    });
  }

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
    this.emitUserRegistered(saved);
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

  /**
   * Step 1: Gửi OTP xác thực email trước khi đăng ký.
   * Lưu thông tin đăng ký tạm + OTP hash vào bảng registration_otps.
   */
  async sendOtp(dto: SendOtpDto) {
    // Kiểm tra email đã tồn tại chưa
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Xoá OTP cũ của email này (nếu có)
    await this.otpRepo.delete({ email: dto.email });

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Hash password trước khi lưu tạm
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Lưu vào DB — hết hạn sau 10 phút
    const record = this.otpRepo.create({
      email: dto.email,
      otp_hash: otpHash,
      full_name: dto.full_name || null,
      password_hash: passwordHash,
      account_type: dto.type ?? AccountType.CUSTOMER,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.otpRepo.save(record);

    // Gửi email
    const isDev = (process.env['NODE_ENV'] ?? 'development') !== 'production';
    try {
      await this.mailer.sendMail({
        from: process.env['SMTP_FROM'] || '"MyNook" <noreply@mynook.com>',
        to: dto.email,
        subject: 'MyNook — Mã xác thực đăng ký',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#e9590c">MyNook</h2>
            <p>Mã xác thực của bạn là:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f5f5f4;border-radius:8px;margin:16px 0">${otp}</div>
            <p style="color:#666;font-size:14px">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (err) {
      console.warn('[AUTH] Failed to send OTP email:', (err as Error).message);
    }

    console.log(`[AUTH] OTP for ${dto.email}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi đến email của bạn.',
      ...(isDev && { dev_otp: otp }),
    };
  }

  /**
   * Step 2: Verify OTP → tạo account thật.
   */
  async verifyOtpAndRegister(dto: VerifyOtpDto) {
    const otpHash = crypto.createHash('sha256').update(dto.otp).digest('hex');

    const record = await this.otpRepo.findOne({
      where: { email: dto.email, otp_hash: otpHash },
    });

    if (!record || record.expires_at < new Date()) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Kiểm tra lại email chưa bị đăng ký (race condition)
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      await this.otpRepo.delete({ email: dto.email });
      throw new ConflictException('Email đã được sử dụng');
    }

    // Tạo account
    const user = this.userRepo.create({
      email: record.email,
      password_hash: record.password_hash,
      full_name: record.full_name,
      type: record.account_type as AccountType,
    });
    const saved = await this.userRepo.save(user);

    // Xoá OTP record
    await this.otpRepo.delete({ email: dto.email });

    this.emitUserRegistered(saved);
    return this.buildResponse(saved);
  }

  /** Emit event qua RabbitMQ để interaction-service tạo thông báo chào mừng */
  private emitUserRegistered(user: Account) {
    const payload: UserRegisteredEvent = {
      accountId: user.id,
      email: user.email,
      fullName: user.full_name,
      type: user.type as AccountType,
    };
    this.interactionClient.emit(RMQ_EVENTS.USER_REGISTERED, payload);
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
