import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@mynook/database';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Kiểm tra email đã tồn tại chưa
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    // Tạo user mới
    const user = this.userRepo.create({
      email: dto.email,
      password_hash,
      full_name: dto.full_name || null,
      phone_number: dto.phone_number || null,
    });

    const saved = await this.userRepo.save(user);

    // Trả token + user info (không trả password_hash)
    return this.buildResponse(saved);
  }

  async login(dto: LoginDto) {
    // Tìm user theo email
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // So sánh password
    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra tài khoản có active không
    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    return this.buildResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }
    return this.sanitizeUser(user);
  }

  private buildResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      phone_number: user.phone_number,
      role: user.role,
      trust_score: user.trust_score,
      created_at: user.created_at,
    };
  }
}
