import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Logs every HTTP request with method, URL, status code, response time,
 * and correlation request ID.
 *
 * Output example:
 *   [HTTP] GET /api/users 200 - 45ms [req-id: abc-123]
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string | undefined;

    // Attach request ID to response header so clients can reference it
    if (requestId) {
      res.setHeader('X-Request-Id', requestId);
    }

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const idTag = requestId ? ` [req-id: ${requestId}]` : '';
      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms${idTag}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
