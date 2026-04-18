import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Account } from '@mynook/database';
import { AccountType } from '@mynook/shared-types';

export interface ListAccountsQuery {
  type?: AccountType;
  is_active?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async listAccounts(query: ListAccountsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.accountRepo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (typeof query.is_active === 'boolean') {
      qb.andWhere('a.is_active = :isActive', { isActive: query.is_active });
    }
    if (query.q) {
      qb.andWhere('(a.email ILIKE :q OR a.full_name ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((a) => this.sanitize(a)),
      page,
      limit,
      total,
    };
  }

  async findById(id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Account không tồn tại');
    return this.sanitize(account);
  }

  /**
   * Dùng để enrich dữ liệu tại gateway khi cần show thông tin user
   * đi kèm với resource khác (ví dụ danh sách review report).
   */
  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.accountRepo.find({ where: { id: In(ids) } });
    return rows.map((a) => this.sanitize(a));
  }

  async setActive(id: string, isActive: boolean) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Account không tồn tại');
    account.is_active = isActive;
    const saved = await this.accountRepo.save(account);
    return this.sanitize(saved);
  }

  async stats() {
    const [total, customers, owners, admins, active, inactive] =
      await Promise.all([
        this.accountRepo.count(),
        this.accountRepo.count({ where: { type: AccountType.CUSTOMER } }),
        this.accountRepo.count({ where: { type: AccountType.OWNER } }),
        this.accountRepo.count({ where: { type: AccountType.ADMIN } }),
        this.accountRepo.count({ where: { is_active: true } }),
        this.accountRepo.count({ where: { is_active: false } }),
      ]);

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recent = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.created_at >= :since', { since })
      .getCount();

    return {
      total,
      by_type: { customer: customers, owner: owners, admin: admins },
      active,
      inactive,
      registered_last_30_days: recent,
    };
  }

  private sanitize(a: Account) {
    return {
      id: a.id,
      email: a.email,
      full_name: a.full_name,
      avatar_url: a.avatar_url,
      phone_number: a.phone_number,
      type: a.type,
      trust_score: a.trust_score,
      is_active: a.is_active,
      created_at: a.created_at,
      updated_at: a.updated_at,
    };
  }
}
