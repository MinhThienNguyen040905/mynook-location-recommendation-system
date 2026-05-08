import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpException,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom, type Observable } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { AuthHeadersInterceptor } from '../../common/interceptors/auth-headers.interceptor.js';

@ApiTags('Admin — Google Maps Imports')
@ApiBearerAuth()
@Controller('admin/imports/google-maps')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(AuthHeadersInterceptor)
export class AdminImportController {
  constructor(private readonly http: HttpService) {}

  private async forward<T>(request$: Observable<AxiosResponse<T>>): Promise<T> {
    try {
      const { data } = await firstValueFrom(request$);
      return data;
    } catch (err) {
      throw this.toHttpException(err);
    }
  }

  private toHttpException(err: unknown): Error {
    const upstream = err as AxiosError;
    const response = upstream.response;
    if (!response) {
      return err instanceof Error ? err : new Error(String(err));
    }

    const body = response.data;
    if (body && typeof body === 'object') {
      return new HttpException(body, response.status);
    }

    return new HttpException(
      {
        statusCode: response.status,
        message: typeof body === 'string' && body.trim() ? body : upstream.message,
      },
      response.status,
    );
  }

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve Google Maps input' })
  async resolve(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: Record<string, unknown>,
  ) {
    return this.forward(
      this.http.post(`${VENUE_SERVICE_URL}/imports/google-maps/resolve`, body, {
        headers: req.authHeaders,
      }),
    );
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Create an import draft' })
  async createDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Body() body: Record<string, unknown>,
  ) {
    return this.forward(
      this.http.post(`${VENUE_SERVICE_URL}/imports/google-maps/drafts`, body, {
        headers: req.authHeaders,
      }),
    );
  }

  @Get('drafts')
  @ApiOperation({ summary: 'List import drafts' })
  async listDrafts(
    @Request() req: { authHeaders: Record<string, string> },
    @Query('status') status?: string,
  ) {
    return this.forward(
      this.http.get(`${VENUE_SERVICE_URL}/imports/google-maps/drafts`, {
        headers: req.authHeaders,
        params: status ? { status } : undefined,
      }),
    );
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get import draft detail' })
  async getDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
  ) {
    return this.forward(
      this.http.get(`${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}`, {
        headers: req.authHeaders,
      }),
    );
  }

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'Update normalized draft data' })
  async updateDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.forward(
      this.http.patch(`${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}`, body, {
        headers: req.authHeaders,
      }),
    );
  }

  @Post('drafts/:id/enrich')
  @ApiOperation({ summary: 'Run enrichment on a draft' })
  async enrichDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
  ) {
    return this.forward(
      this.http.post(`${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}/enrich`, {}, {
        headers: req.authHeaders,
      }),
    );
  }

  @Post('drafts/:id/import-reviews')
  @ApiOperation({ summary: 'Select review snippets for publish' })
  async importReviews(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.forward(
      this.http.post(
        `${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}/import-reviews`,
        body,
        { headers: req.authHeaders },
      ),
    );
  }

  @Post('drafts/:id/publish')
  @ApiOperation({ summary: 'Publish a draft' })
  async publishDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
  ) {
    return this.forward(
      this.http.post(`${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}/publish`, {}, {
        headers: req.authHeaders,
      }),
    );
  }

  @Post('drafts/:id/reject')
  @ApiOperation({ summary: 'Reject a draft' })
  async rejectDraft(
    @Request() req: { authHeaders: Record<string, string> },
    @Param('id') id: string,
  ) {
    return this.forward(
      this.http.post(`${VENUE_SERVICE_URL}/imports/google-maps/drafts/${id}/reject`, {}, {
        headers: req.authHeaders,
      }),
    );
  }
}
