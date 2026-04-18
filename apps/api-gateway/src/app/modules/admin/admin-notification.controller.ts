import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_SERVICE_URL,
  INTERACTION_SERVICE_URL,
  AccountType,
} from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

type BroadcastTarget = 'all' | AccountType.CUSTOMER | AccountType.OWNER;

interface BroadcastBody {
  title: string;
  message: string;
  type?: 'system' | 'promo' | 'reminder' | 'review_reply';
  target?: BroadcastTarget;
  account_ids?: string[];
}

@ApiTags('Admin — Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminNotificationController {
  constructor(private readonly http: HttpService) {}

  @Post('broadcast')
  @ApiOperation({
    summary:
      'Gửi thông báo tổng: target = all | customer | owner; hoặc truyền account_ids để nhắm chính xác',
  })
  async broadcast(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: BroadcastBody,
  ) {
    if (!body.title || !body.message) {
      throw new BadRequestException('title và message là bắt buộc');
    }

    let accountIds = body.account_ids ?? [];

    // Nếu không truyền danh sách ids cụ thể thì resolve theo target
    if (!accountIds.length) {
      const target: BroadcastTarget = body.target ?? 'all';
      const accounts = await this.fetchAllAccounts(req.authHeaders, target);
      accountIds = accounts.map((a) => a.id);
    }

    if (!accountIds.length) {
      return { inserted: 0, total: 0, message: 'Không có account nào khớp' };
    }

    const { data } = await firstValueFrom(
      this.http.post(
        `${INTERACTION_SERVICE_URL}/admin/interaction/notifications/broadcast`,
        {
          title: body.title,
          message: body.message,
          type: body.type,
          account_ids: accountIds,
        },
        { headers: req.authHeaders },
      ),
    );
    return data;
  }

  /** Paginate auth-service để gom hết ids theo target */
  private async fetchAllAccounts(
    headers: Record<string, string>,
    target: BroadcastTarget,
  ): Promise<Array<{ id: string }>> {
    const all: Array<{ id: string }> = [];
    const limit = 100;
    let page = 1;

    for (;;) {
      const params: Record<string, string | number> = {
        page,
        limit,
        is_active: 'true',
      };
      if (target !== 'all') params['type'] = target;

      const { data } = await firstValueFrom(
        this.http.get<{
          data: Array<{ id: string }>;
          total: number;
        }>(`${AUTH_SERVICE_URL}/admin/accounts`, { headers, params }),
      );

      all.push(...data.data);
      if (all.length >= data.total || data.data.length < limit) break;
      page++;
    }

    return all;
  }
}
