/// <reference types="multer" />
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CloudinaryService } from '@mynook/cloudinary';
import type { UploadedFile } from '@mynook/cloudinary';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image and video files are allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload images/videos to Cloudinary' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results = await Promise.all(
      files.map((file) => {
        const uploaded: UploadedFile = {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        };

        if (file.mimetype.startsWith('video/')) {
          return this.cloudinary.uploadVideo(uploaded, 'mynook/venues/videos');
        }
        return this.cloudinary.uploadImage(uploaded, 'mynook/venues/images');
      }),
    );

    return results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
      resource_type: r.resource_type,
      format: r.format,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
    }));
  }
}
