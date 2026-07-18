import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidRefreshTokenException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidResetTokenException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ResourceAlreadyExistsException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenActionException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictActionException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
