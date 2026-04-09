import { memoryStorage } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const multerConfig: MulterOptions = {
  storage: memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
