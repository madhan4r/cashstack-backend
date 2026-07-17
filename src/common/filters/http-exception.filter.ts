import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces';

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, errors } = this.buildErrorBody(exception);

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiErrorResponse = {
      success: false,
      message,
      errors,
    };

    response.status(status).json(body);
  }

  private buildErrorBody(exception: unknown): {
    message: string;
    errors: string[];
  } {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return { message: exceptionResponse, errors: [exceptionResponse] };
      }

      const { message, error } = exceptionResponse as HttpExceptionResponse;

      const errors = Array.isArray(message)
        ? message
        : [message ?? error ?? exception.message];

      const summary = Array.isArray(message)
        ? (error ?? exception.message)
        : (message ?? error ?? exception.message);

      return { message: summary, errors };
    }

    const message = 'Internal server error';
    return { message, errors: [message] };
  }
}
