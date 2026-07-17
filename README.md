# CashStack Backend

Production-ready NestJS backend foundation for CashStack, a personal finance application.

This repository currently ships the **project foundation only**: configuration, database
connectivity, authentication, and user profile management. Business modules such as
Transactions, Categories, Budgets, Reports, and Dashboard are intentionally not implemented
yet — the architecture here is designed for them to plug into.

## Tech Stack

- [NestJS](https://nestjs.com/) 11 (TypeScript)
- MongoDB via [Mongoose](https://mongoosejs.com/)
- JWT authentication with access + refresh tokens (rotation on every refresh)
- [Argon2](https://github.com/ranisalt/node-argon2) password hashing
- Swagger / OpenAPI documentation
- class-validator / class-transformer request validation
- Helmet, compression, CORS, and rate limiting (`@nestjs/throttler`)
- Joi-based environment variable validation

## Project Structure

```
src/
  auth/                 # Register, login, refresh, logout, JWT strategies
    dto/
    interfaces/
    strategies/
    auth.controller.ts
    auth.module.ts
    auth.service.ts
  users/                 # Current user profile
    dto/
    interfaces/
    schemas/
    users.controller.ts
    users.module.ts
    users.service.ts
  common/                # Cross-cutting building blocks shared by every feature
    constants/
    decorators/          # @Public(), @CurrentUser()
    dto/
    enums/
    exceptions/
    filters/             # Global HTTP exception filter
    guards/               # JwtAuthGuard, RefreshJwtAuthGuard
    interceptors/         # Global response envelope interceptor
    interfaces/
    middleware/           # Request logging middleware
    pipes/
    utils/                 # Password hashing helpers
  config/                # ConfigModule, typed AppConfigService, env validation
  database/              # MongooseModule connection setup
  app.controller.ts       # Health check endpoint
  app.module.ts
  main.ts
```

Each business module added later (Transactions, Categories, Budgets, …) should follow the
same `controller / service / module / dto / schemas / interfaces` layout used by `auth` and
`users`, and can reuse everything under `common/`.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A running MongoDB instance (local or Atlas)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable                 | Description                                          |
| ------------------------ | ----------------------------------------------------- |
| `PORT`                   | Port the API listens on (default `3000`)              |
| `MONGO_URI`               | MongoDB connection string                              |
| `JWT_SECRET`               | Secret used to sign access tokens                       |
| `JWT_REFRESH_SECRET`       | Secret used to sign refresh tokens (must differ from above) |
| `JWT_EXPIRES_IN`           | Access token lifetime (e.g. `15m`)                      |
| `JWT_REFRESH_EXPIRES_IN`   | Refresh token lifetime (e.g. `7d`)                       |
| `CLIENT_URL`               | Origin allowed by CORS                                   |

Environment variables are validated on startup (`src/config/env.validation.ts`) — the app
will fail fast with a clear error if a required variable is missing or malformed.

### 3. Run the app

```bash
npm run start:dev   # watch mode
npm run start        # single run
npm run start:prod   # run compiled output (after npm run build)
```

The API is served under the `/api/v1` prefix, e.g. `http://localhost:3000/api/v1/auth/login`.

### 4. Explore the API

Swagger UI is available at `http://localhost:3000/api/docs` once the app is running.

## Authentication Flow

1. `POST /api/v1/auth/register` — create an account, returns an access + refresh token pair.
2. `POST /api/v1/auth/login` — authenticate with email/password, returns a new token pair.
3. `POST /api/v1/auth/refresh` — send the refresh token as a `Bearer` token to rotate it for
   a new access + refresh token pair. The previous refresh token is invalidated.
4. `POST /api/v1/auth/logout` — invalidates the current refresh token (requires access token).
5. `GET /api/v1/users/me` — fetch the authenticated user's profile (requires access token).
6. `PATCH /api/v1/users/me` — update the authenticated user's profile (requires access token).

All routes are protected by a global `JwtAuthGuard` by default; use the `@Public()` decorator
to opt an endpoint out (already applied to health check, register, login, and refresh).

## Response Format

Every endpoint returns a consistent envelope, produced by the global `ResponseInterceptor`
and `HttpExceptionFilter`:

Success:

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "...": "..." }
}
```

Error:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": ["Invalid email or password"]
}
```

## Scripts

| Command             | Description                          |
| -------------------- | ------------------------------------- |
| `npm run start:dev`  | Start in watch mode                    |
| `npm run build`      | Compile TypeScript to `dist/`          |
| `npm run lint`       | Run ESLint with autofix                |
| `npm run format`     | Run Prettier                            |
| `npm run test`       | Run unit tests                          |
| `npm run test:e2e`   | Run end-to-end tests                    |

## Security Notes

- Passwords are hashed with Argon2 before storage and are never returned in API responses
  (enforced both at the schema level with `select: false` and via the schema's `toJSON`
  transform).
- Refresh tokens are rotated on every use and stored only as an Argon2 hash on the user
  document, so a stolen refresh token cannot be replayed after its first use.
- Helmet sets secure HTTP headers; `@nestjs/throttler` rate-limits requests globally.
- All input is validated and whitelisted via a global `ValidationPipe`
  (`forbidNonWhitelisted: true`).
