# Backend Analysis

Date: 2026-07-06

## Overview

This backend is a TypeScript ESM Express API for a task management system. It uses:

- Express 5 for HTTP routing
- Prisma 7 with PostgreSQL for user accounts
- Mongoose with MongoDB for tasks, projects, and activity logs
- Redis for caching, rate limiting, token blacklisting, and user-profile cache
- JWT authentication with an HTTP-only cookie and Bearer-token support
- Swagger/OpenAPI docs at `/api-docs`

Current build status:

```bash
npm.cmd run build
```

Result: passes successfully.

## Runtime Entry Flow

Main startup path:

```text
src/server.ts
  imports app from src/app.ts
  calls connectDB()
  starts Express server
  handles shutdown signals

src/app.ts
  creates Express app
  loads .env
  registers body parsing, logger, CORS, routes, Swagger, and error handlers
```

Database startup is centralized in `src/config/database.ts`:

```text
connectDB()
  connectPostgreSQL()
  connectMongoDB()
  connectRedis()
```

Shutdown calls:

```text
disconnectDB()
  disconnectPostgreSQL()
  disconnectMongoDB()
  disconnectRedis()
```

## API Routes

All routes are mounted under `/api`.

```text
GET    /api
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/logout-all
GET    /api/auth/me
POST   /api/auth/change-password

POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/stats
GET    /api/tasks/:id
PUT    /api/tasks/:id
PATCH  /api/tasks/:id/status
DELETE /api/tasks/:id
POST   /api/tasks/:id/comments

POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members

GET    /api/dashboard
GET    /api/dashboard/health
```

## Data Storage

### PostgreSQL

Defined in `prisma/schema.prisma`.

Current Prisma model:

```text
User
  id
  name
  email
  password
  role
  createdAt
```

PostgreSQL is used for authentication and user identity.

### MongoDB

MongoDB stores the main task-management resources.

Models:

- `Task`
- `Project`
- `ActivityLog`

Task documents include status, priority, assignment, creator, project reference, subtasks, comments, attachments, time estimates, and metadata.

Project documents include owner, members, status, visibility, dates, tags, and custom fields.

Activity logs record user actions on tasks/projects/comments/subtasks.

### Redis

Redis is used for:

- Caching GET responses
- Rate limiting
- JWT blacklist on logout/refresh
- User profile cache

The code gracefully continues when `REDIS_URL` is missing or Redis connection fails.

## Auth Flow

### Register

`POST /api/auth/register`

The service:

1. Requires `name`, `email`, `password`, and `role`.
2. Checks whether the email already exists.
3. Hashes the password with bcrypt.
4. Creates the user in PostgreSQL.

### Login

`POST /api/auth/login`

The service:

1. Looks up the user by email.
2. Compares the password using bcrypt.
3. Generates a JWT.
4. Caches the user profile in Redis.
5. Controller stores JWT in an HTTP-only cookie named `token`.

### Protected Routes

Protected routes use `authenticate` from `src/middleware/authMiddleware.ts`.

The middleware accepts:

- `Authorization: Bearer <token>`
- Cookie header containing `token=<jwt>`

It also checks Redis token blacklist before accepting a JWT.

## Strengths

- Good separation between routes, controllers, services, models, middleware, and config.
- Passwords are hashed with bcrypt.
- JWT supports both cookie and Bearer-token authentication.
- Prisma and Mongoose are separated cleanly by data ownership.
- Redis integration is optional and fails open, which helps local development.
- Activity logging exists for task mutations.
- TypeScript build currently passes.
- Swagger docs are configured.
- Graceful shutdown closes PostgreSQL, MongoDB, and Redis.

## High-Priority Issues

### 1. Cache Keys Can Leak User Data

The cache middleware uses:

```ts
const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
```

This key does not include the authenticated user ID.

Example risk:

1. User A calls `GET /api/tasks`.
2. Response is cached as `tasks:list:/api/tasks`.
3. User B calls `GET /api/tasks`.
4. User B can receive User A's cached task list.

Affected routes:

- `GET /api/tasks`
- `GET /api/tasks/stats`
- `GET /api/tasks/:id`
- `GET /api/projects`
- `GET /api/projects/:id`

Recommended fix:

Include user ID and relevant role/scope in the cache key:

```ts
const userId = (req as any).user?.id || 'anonymous';
const cacheKey = `${keyPrefix}:user:${userId}:${req.originalUrl || req.url}`;
```

Also include role where admin/user responses differ.

### 2. Admin Dashboard Logic Does Not Work Reliably

`dashboardController.ts` checks:

```ts
const userRole = (req as any).user?.role || 'user';
```

But `generateToken()` only signs:

```ts
{ id, email }
```

So authenticated requests usually do not have `req.user.role`. This means dashboard admin behavior likely falls back to regular user behavior.

Recommended fixes:

- Include `role` in JWT payload, or
- Fetch the user from PostgreSQL/Redis inside `authenticate` and attach the role to `req.user`.

### 3. `req.cookies` Is Used But Cookie Parser Is Not Registered

`authController.extractToken()` reads:

```ts
req.cookies?.token
```

But `app.ts` does not register `cookie-parser`, and `package.json` does not include it.

Some auth paths still work because `authMiddleware.ts` manually parses `req.headers.cookie`, but `refresh-token` uses `req.cookies`.

Recommended fix:

Install and register cookie parser:

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

Then in `app.ts`:

```ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

Or remove all `req.cookies` usage and use the existing manual cookie parser consistently.

### 4. Public Registration Lets Client Choose Role

Registration currently requires `role` from the request body.

Risk:

```json
{
  "name": "Bad Actor",
  "email": "bad@example.com",
  "password": "Password123",
  "role": "admin"
}
```

Recommended fix:

Default all public registrations to `user` server-side:

```ts
role: 'user'
```

Create a protected admin-only endpoint or script for role changes.

### 5. Cache Invalidation Is Incomplete

Task create/update/status/comment invalidate some task cache keys, but:

- Task delete does not invalidate task list/stats/detail cache.
- Project create/update/delete/member changes do not invalidate project cache.
- Dashboard cache is not currently used, but if added later it must also invalidate on changes.

Recommended fix:

Add cache invalidation to every mutation path.

## Medium-Priority Issues

### 1. MongoDB Connection Failure Does Not Fail Startup

`connectMongoDB()` catches errors, logs them, schedules retry, and does not throw.

But `connectDB()` logs:

```text
All databases connected successfully
```

even if MongoDB failed and is only retrying.

Recommended fix:

For required services, throw on initial connection failure. If MongoDB is optional, rename the log to reflect partial connectivity.

### 2. CORS Reflects Any Origin When `FRONTEND_URL` Is Missing

Current logic:

```ts
const allowedOrigin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
```

With credentials enabled, reflecting arbitrary origins is risky.

Recommended fix:

Use an allowlist:

```ts
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean);
```

Then only set `Access-Control-Allow-Origin` when the request origin is allowed.

### 3. Redis `KEYS` Usage Can Hurt Production

`deletePattern()` and dashboard Redis inspection use `keys(pattern)`.

This is acceptable for small local development, but not ideal for production Redis because `KEYS` can block the server.

Recommended fix:

Use `SCAN` for pattern operations or maintain namespaced sets of cache keys.

### 4. JWT Secret Is Not Validated At Startup

`JWT_SECRET` is cast as a string, but there is no startup validation.

Recommended fix:

Fail fast if required environment variables are missing:

- `DATABASE_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL` for production

### 5. Error Responses Are Inconsistent

Some controllers return:

```json
{ "error": "..." }
```

Other paths return:

```json
{ "success": false, "message": "..." }
```

Recommended fix:

Standardize response shape across controllers and middleware.

## Code Quality Notes

- Several files contain mojibake/encoding-corrupted comments and log text such as `âœ…` instead of normal symbols. This is mostly cosmetic but makes logs and source harder to read.
- `dist/` exists in the backend and is not ignored by `backend/.gitignore`. If this is not meant to be committed, add `dist` to `.gitignore`.
- `bcrypt` and `bcryptjs` are both installed, but the code currently uses `bcrypt`. Remove the unused dependency if no longer needed.
- `@types/redis` is installed even though modern `redis` includes its own types.
- `authorize()` is a placeholder and does not enforce roles yet.
- `optionalAuthenticate` is imported but currently unused.
- `src/services/ActivityLog.ts` appears to duplicate the MongoDB model responsibility and may be unnecessary.
- `server.ts` still has a stale comment saying MongoDB is already connected in `app.ts`, but the connection is now centralized in `connectDB()`.

## Suggested Backend Folder Ownership

```text
src/
  app.ts                 Express app setup
  server.ts              Process startup/shutdown
  config/                External service clients and docs config
  controllers/           HTTP request/response handling
  middleware/            Auth, caching, rate limit, logging, errors
  models/                Prisma/Mongoose model adapters
  routes/                Express route declarations
  services/              Business logic
  types/                 Shared TypeScript contracts
  utils/                 Small shared helpers
  scripts/               Manual/maintenance scripts
```

## Recommended Next Steps

1. Fix cache key scoping by user ID before using Redis cache in multi-user testing.
2. Fix role handling by adding role to JWT or enriching `req.user` from database/cache.
3. Prevent public clients from choosing `role` during registration.
4. Register `cookie-parser` or remove all `req.cookies` usage.
5. Add cache invalidation for task delete and all project mutations.
6. Add environment validation at startup.
7. Replace Redis `KEYS` usage with `SCAN` before production.
8. Normalize API response format and validation errors.
9. Add tests for auth, task access control, cache scoping, and project member authorization.
10. Clean `.gitignore` and remove generated `dist/` from source control if desired.

## Quick Verification Commands

```bash
npm.cmd run build
```

Expected: TypeScript build passes.

```bash
npm run dev
```

Expected: server starts, connects to PostgreSQL and MongoDB, and optionally Redis if `REDIS_URL` is configured.

## Summary

The backend has a good layered foundation and now covers authentication, tasks, projects, dashboard data, Redis cache/rate limiting, and Swagger docs. The most important fixes are security-related: cache scoping, role handling, public role assignment, and cookie parsing consistency. After those are handled, the project will be much closer to a solid interview-ready backend.
