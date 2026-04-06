import { Module } from '@nestjs/common';
import { CloudinaryModule } from '@mynook/cloudinary';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [CloudinaryModule],
  controllers: [UploadController],
})
export class UploadModule {}
