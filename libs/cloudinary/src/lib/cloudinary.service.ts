import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type {
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { CLOUDINARY, type CloudinaryInstance } from './cloudinary.constants.js';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
  resource_type: string;
  bytes: number;
  duration?: number;
}

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private readonly cld: CloudinaryInstance,
  ) {}

  /**
   * Upload a single image from a buffer (multipart file).
   * @param file  - The uploaded file (buffer, originalname, mimetype)
   * @param folder - Cloudinary folder path, e.g. 'venues/images'
   */
  async uploadImage(
    file: UploadedFile,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File is not an image');
    }

    return this.uploadToCloudinary(file.buffer, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
  }

  /**
   * Upload a single video from a buffer.
   * @param file  - The uploaded file
   * @param folder - Cloudinary folder path, e.g. 'venues/videos'
   */
  async uploadVideo(
    file: UploadedFile,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File is not a video');
    }

    return this.uploadToCloudinary(file.buffer, {
      folder,
      resource_type: 'video',
    });
  }

  /**
   * Upload multiple images at once.
   */
  async uploadImages(
    files: UploadedFile[],
    folder: string,
  ): Promise<CloudinaryUploadResult[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  /**
   * Delete a resource by its public_id.
   */
  async delete(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<{ result: string }> {
    return new Promise((resolve, reject) => {
      this.cld.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error: UploadApiErrorResponse | undefined, result: { result: string } | undefined) => {
          if (error) return reject(error);
          resolve(result as { result: string });
        },
      );
    });
  }

  /**
   * Delete multiple resources by their public_ids.
   */
  async deleteMany(
    publicIds: string[],
    resourceType: 'image' | 'video' = 'image',
  ): Promise<void> {
    await this.cld.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
  }

  private uploadToCloudinary(
    buffer: Buffer,
    options: Record<string, unknown>,
  ): Promise<CloudinaryUploadResult> {
    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = this.cld.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) return reject(error);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type,
            bytes: result.bytes,
            duration: result.duration,
          });
        },
      );
      stream.end(buffer);
    });
  }
}
