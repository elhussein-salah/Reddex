import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Logs every HTTP request with method, URL, status code, response time,
 * correlation request ID, and authenticated user ID if present.
 *
 * Output example:
 *   [HTTP] GET /api/users 200 - 45ms [req-id: abc-123] [user: 42]
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

      // Extract userId from JWT payload if the AuthGuard has run
      const user = (req as any).user;
      const userTag = user?.sub ? ` [user: ${user.sub}]` : '';

      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms${idTag}${userTag}`;

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
