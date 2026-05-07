import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Global interceptor that wraps all successful responses in a
 * consistent `{ statusCode, message, data }` envelope.
 *
 * Responses that already have a `statusCode` property (i.e. they
 * are already wrapped, e.g. from services returning `ApiResponse`)
 * are passed through unchanged to avoid double-wrapping.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Already wrapped — don't double-wrap
        if (data && typeof data === 'object' && 'statusCode' in data) {
          return data;
        }

        const statusCode = context.switchToHttp().getResponse().statusCode;

        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
