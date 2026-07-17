import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces';

interface ResponseWithMessage {
  message?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        const { message, data } = this.normalize(result);
        return {
          success: true,
          message,
          data,
        };
      }),
    );
  }

  private normalize(result: T): { message: string; data: T } {
    if (
      result &&
      typeof result === 'object' &&
      'message' in (result as ResponseWithMessage) &&
      'data' in (result as object)
    ) {
      const { message, data } = result as unknown as {
        message: string;
        data: T;
      };
      return { message, data };
    }

    return { message: 'Request successful', data: result };
  }
}
