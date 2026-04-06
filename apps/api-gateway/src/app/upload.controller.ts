/// <reference types="multer" />
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VENUE_SERVICE_URL } from '@mynook/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthHeadersInterceptor } from './interceptors/auth-headers.interceptor.js';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly http: HttpService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    AuthHeadersInterceptor,
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only image and video files are allowed'),
            false,
          );
        }
      },
    }),
  )
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload media files (images/videos)' })
  @ApiResponse({ status: 201, description: 'Files uploaded' })
  async uploadFiles(
    @Request() req: { authHeaders: Record<string, string> },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Build FormData to forward to venue-service
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    const { data } = await firstValueFrom(
      this.http.post(`${VENUE_SERVICE_URL}/upload`, formData, {
        headers: {
          ...req.authHeaders,
          ...formData.getHeaders(),
        },
        maxContentLength: MAX_FILE_SIZE * MAX_FILES,
        maxBodyLength: MAX_FILE_SIZE * MAX_FILES,
      }),
    );
    return data;
  }
}
