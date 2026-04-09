import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { UploadApiResponse, v2 as CloudinaryType } from 'cloudinary';
import { UploadFolder } from '../enums';
import { UploadedFileResponse, UploadOptions } from './interfaces';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  private readonly maxSize = 5 * 1024 * 1024;

  constructor(
    @Inject('CLOUDINARY') private cloudinary: typeof CloudinaryType,
  ) {}

  // ================== PUBLIC ==================

  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    userId?: string,
    options?: UploadOptions,
  ): Promise<UploadedFileResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.validateFile(file);

    const finalFolder = this.buildFolderPath(folder, userId);

    try {
      const result = await this.uploadToCloudinary(file, finalFolder, options);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error: unknown) {
      const err = this.normalizeError(error);

      this.logger.error('Upload failed', err.stack);

      throw new InternalServerErrorException('Image upload failed');
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      const err = this.normalizeError(error);

      this.logger.error('Delete failed', err.stack);

      throw new InternalServerErrorException('Image deletion failed');
    }
  }

  extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;

      const withoutVersion = parts[1].replace(/^v\d+\//, '');
      return withoutVersion.replace(/\.[^/.]+$/, '');
    } catch {
      return null;
    }
  }

  // ================== PRIVATE ==================

  private validateFile(file: Express.Multer.File) {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP allowed',
      );
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }
  }

  private buildFolderPath(folder: UploadFolder, userId?: string): string {
    return userId ? `${folder}/${userId}` : folder;
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    options?: UploadOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [
              {
                width: options?.width ?? 400,
                height: options?.height ?? 400,
                crop: 'fill',
                gravity: 'auto',
              },
              {
                quality: 'auto',
                fetch_format: 'auto',
              },
            ],
          },
          (error, result) => {
            if (error) {
              return reject(this.normalizeError(error));
            }

            if (!result) {
              return reject(new Error('Upload failed'));
            }

            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
