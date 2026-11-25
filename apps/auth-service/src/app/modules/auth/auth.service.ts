import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
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
import { AccountType, AUTH_ERROR_CODES, RMQ_EVENTS, getJwtSecrets } from '@mynook/shared-types';
import type { UserRegisteredEvent } from '@mynook/shared-types';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto.js';
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, generateOtp, hashOtp, otpMatches } from './otp.js';

const jwtConfig = getJwtSecrets();

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly mailer: nodemailer.Transporter;
  private rmqConnected = false;

  constructor(
    @InjectRepository(Account)
    private readonly userRepo: Repository<Account>,
    @InjectRepository(RegistrationOtp)
    private readonly otpRepo: Repository<RegistrationOtp>,
    private readonly jwtService: JwtService,
    @Inject('EVENTS_SERVICE')
    private readonly eventsClient: ClientProxy,
  ) {
    const smtpUser = process.env['SMTP_USER']?.trim();
    this.mailer = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: Number(process.env['SMTP_PORT'] || 587),
      secure: false,
      // Không có SMTP_USER (vd Mailpit khi dev / test) → gửi không xác thực
      ...(smtpUser ? { auth: { user: smtpUser, pass: process.env['SMTP_PASS'] } } : {}),
    });
  }

  /** Địa chỉ web-client — dùng cho liên kết trong email */
  private appUrl(): string {
    return (process.env['APP_URL'] || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000').replace(/\/+$/, '');
  }

  private fromAddress(): string {
    return process.env['SMTP_FROM'] || '"MyNook" <noreply@mynook.com>';
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

    // ⚠️ Giữ thứ tự: so mật khẩu TRƯỚC, kiểm tra khoá SAU. Nhờ vậy thông báo
    // "bị khoá" chỉ lộ ra với người đã nhập đúng mật khẩu → không dò được email tồn tại.
    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.is_active) {
      throw this.accountDisabled();
    }

    return this.buildResponse(user);
  }

  /** 401 kèm mã máy đọc được để client phân biệt với sai mật khẩu (spec 001 AC-2.3, LOG-003) */
  private accountDisabled(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      message: 'Tài khoản đã bị vô hiệu hóa',
      error: 'Unauthorized',
      error_code: AUTH_ERROR_CODES.ACCOUNT_DISABLED,
    });
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
        secret: jwtConfig.refreshSecret,
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User không tồn tại hoặc đã bị vô hiệu hóa');
      }
      if (!user.is_active) {
        throw this.accountDisabled();
      }

      return this.buildTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Quên mật khẩu — tạo reset token, lưu dạng băm, gửi email chứa liên kết đặt lại
   * (spec 001 GAP 1, LOG-004). Dev: trả thêm token trong response để tiện thử nghiệm.
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

    const isDev = (process.env['NODE_ENV'] ?? 'development') !== 'production';
    const resetLink = `${this.appUrl()}/forgot-password?token=${rawToken}`;
    try {
      await this.mailer.sendMail({
        from: this.fromAddress(),
        to: dto.email,
        subject: 'MyNook — Đặt lại mật khẩu',
        text: `Mở liên kết sau để đặt lại mật khẩu (hiệu lực 1 giờ):\n${resetLink}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#e9590c">MyNook</h2>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực trong 1 giờ.</p>
            <p style="text-align:center;margin:24px 0">
              <a href="${resetLink}" style="background:#e9590c;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Đặt lại mật khẩu</a>
            </p>
            <p style="color:#666;font-size:13px;word-break:break-all">Hoặc mở: ${resetLink}</p>
            <p style="color:#666;font-size:14px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (err) {
      // Không lộ lỗi ra phản hồi (giữ thông báo trung tính — AC-3.1, NFR-3)
      this.logger.warn(`Failed to send password reset email: ${(err as Error).message}`);
    }

    // Chỉ ghi token ra log khi dev — log production không được chứa bí mật
    if (isDev) this.logger.debug(`[dev] Password reset link for ${dto.email}: ${resetLink}`);

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

    // OTP 6 chữ số từ bộ sinh an toàn mật mã (GAP 5)
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

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
      expires_at: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
    });
    await this.otpRepo.save(record);

    // Gửi email
    const isDev = (process.env['NODE_ENV'] ?? 'development') !== 'production';
    try {
      await this.mailer.sendMail({
        from: this.fromAddress(),
        to: dto.email,
        subject: 'MyNook — Mã xác thực đăng ký',
        text: `Mã xác thực MyNook của bạn: ${otp}\nMã có hiệu lực trong 10 phút.`,
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
      this.logger.warn(`Failed to send OTP email: ${(err as Error).message}`);
    }

    // Chỉ ghi OTP ra log khi dev — log production không được chứa bí mật
    if (isDev) this.logger.debug(`[dev] OTP for ${dto.email}: ${otp}`);

    return {
      message: 'Mã OTP đã được gửi đến email của bạn.',
      ...(isDev && { dev_otp: otp }),
    };
  }

  /**
   * Step 2: Verify OTP → tạo account thật.
   */
  async verifyOtpAndRegister(dto: VerifyOtpDto) {
    // Tìm theo email (không theo hash) để đếm được số lần nhập sai — GAP 6
    const record = await this.otpRepo.findOne({ where: { email: dto.email } });

    if (!record || record.expires_at < new Date()) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    if (!otpMatches(String(dto.otp ?? ''), record.otp_hash)) {
      const attempts = (record.attempts ?? 0) + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.otpRepo.delete({ email: dto.email });
        throw new BadRequestException('Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới');
      }
      await this.otpRepo.update({ id: record.id }, { attempts });
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

  async onModuleInit() {
    try {
      await this.eventsClient.connect();
      this.rmqConnected = true;
      this.logger.log('Connected to RabbitMQ (EVENTS_SERVICE)');
    } catch (err) {
      this.logger.warn(`RabbitMQ not available: ${(err as Error).message}. Events will be skipped.`);
    }
  }

  /** Emit event qua RabbitMQ để interaction-service tạo thông báo chào mừng */
  private emitUserRegistered(user: Account) {
    if (!this.rmqConnected) {
      this.logger.warn(`Skipping user.registered event for ${user.email} — RMQ not connected`);
      return;
    }
    const payload: UserRegisteredEvent = {
      accountId: user.id,
      email: user.email,
      fullName: user.full_name,
      type: user.type as AccountType,
    };
    this.eventsClient.emit(RMQ_EVENTS.USER_REGISTERED, payload).subscribe({
      next: () => this.logger.log(`Emitted user.registered for ${user.email}`),
      error: (err: Error) => this.logger.warn(`Failed to emit user.registered: ${err.message}`),
    });
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
        secret: jwtConfig.refreshSecret,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: jwtConfig.refreshExpiresIn as any,
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
