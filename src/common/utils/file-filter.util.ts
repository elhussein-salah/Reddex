import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function imageFileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!file) {
    return callback(null, false);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      ),
      false,
    );
  }

  callback(null, true);
}
