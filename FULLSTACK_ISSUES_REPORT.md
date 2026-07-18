# Full-Stack Issues Report

Date: 2026-07-08

Project: Task Management System

Scope:

- Backend: Express, TypeScript, Prisma, PostgreSQL, MongoDB, Redis
- Frontend: Next.js, React, TypeScript, Tailwind CSS, Redux Toolkit Query

## Current Build Status

### Backend

Command:

```bash
cd backend
npm.cmd run build
```

Result:

```text
Passes successfully.
```

### Frontend

Command:

```bash
cd frontend
npm.cmd run build
```

Result:

```text
Fails during TypeScript checking.
```

Current error:

```text
./src/app/dashboard/tasks/[id]/edit/page.tsx:21:14
Type error: Property 'data' does not exist on type 'Task'.
```

This confirms the frontend is expecting a response shape that does not match the current API typings/actual backend response.

## Main Full-Stack Problem

The backend and frontend are both partially implemented, but they do not fully agree on:

- API response shapes
- Authentication state model
- Route paths
- User role handling
- Task/project data types
- Error response format

The backend is currently more build-stable than the frontend. The frontend has the bigger immediate blocker because production build fails.

## Critical Issues

### 1. Frontend And Backend API Response Shapes Do Not Match

Backend routes return mixed response formats.

Examples:

Task list returns:

```json
{
  "tasks": [],
  "pagination": {}
}
```

Task detail returns task object directly:

```json
{
  "_id": "...",
  "title": "..."
}
```

Project list returns array directly:

```json
[
  {
    "_id": "...",
    "name": "..."
  }
]
```

Auth routes return:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Frontend often expects:

```ts
data.data
```

Impact:

- Frontend build fails.
- Task edit page fails type checking.
- Task/project detail pages may show "not found" even when data exists.
- Project list can appear empty even when backend returns projects.

Recommended fix:

Choose one response convention and use it everywhere.

Best option:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

For paginated responses:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {}
  }
}
```

Then update frontend RTK Query types and `transformResponse` accordingly.

### 2. Frontend Routes Do Not Match Actual Next.js Route Structure

Actual frontend route files are under:

```text
/dashboard/tasks
/dashboard/projects
/dashboard/profile
```

But many links and redirects point to:

```text
/tasks
/projects
/profile
/settings
```

Affected areas:

```text
frontend/src/components/layout/ProtectedLayout.tsx
frontend/src/app/dashboard/tasks/page.tsx
frontend/src/app/dashboard/tasks/[id]/page.tsx
frontend/src/app/dashboard/projects/page.tsx
frontend/src/app/dashboard/projects/[id]/page.tsx
frontend/src/components/tasks/TaskForm.tsx
frontend/src/components/projects/ProjectForm.tsx
```

Impact:

- Sidebar links can 404.
- Task/project links can 404.
- Create/edit redirects can go to wrong pages.

Recommended fix:

Use dashboard-prefixed paths consistently:

```text
/dashboard/tasks
/dashboard/tasks/new
/dashboard/tasks/:id
/dashboard/tasks/:id/edit
/dashboard/projects
/dashboard/projects/new
/dashboard/projects/:id
/dashboard/projects/:id/edit
/dashboard/profile
/dashboard/profile/change-password
```

### 3. Auth Model Is Inconsistent Between Frontend And Backend

Backend behavior:

- Login sets JWT in an HTTP-only cookie named `token`.
- Backend does not expose token to JavaScript.
- Protected backend routes accept the cookie or Bearer token.

Frontend behavior:

- Expects `data.data.token`.
- Stores token in Redux.
- Stores token in `localStorage`.
- Adds `Authorization: Bearer <token>` when token exists.

Impact:

- Redux auth state may not update after login.
- `localStorage` token logic is misleading or dead code.
- The app mixes cookie auth and token auth.

Recommended fix:

Use cookie-only auth on the frontend:

- Keep `credentials: 'include'`.
- Remove token from Redux auth state.
- Remove localStorage token logic.
- Store only the user object in Redux.
- After login, call `/auth/me` or use returned user data.

Target flow:

```text
POST /api/auth/login
  -> backend sets HTTP-only cookie
  -> frontend stores user
  -> protected requests automatically include cookie
```

### 4. Backend Role Handling Is Not Aligned With Frontend/Admin Logic

Backend user model has:

```text
role
```

Dashboard controller checks:

```ts
req.user?.role
```

But JWT generation signs only:

```ts
{ id, email }
```

Impact:

- Dashboard admin logic likely falls back to regular user mode.
- Frontend cannot reliably show admin vs user UI.

Recommended fix:

Either:

- Include role in JWT payload, or
- In `authenticate`, fetch user from PostgreSQL/Redis and attach role to `req.user`.

Preferred:

```text
JWT contains id/email only
authenticate enriches req.user from trusted database/cache
```

### 5. Public Registration Allows Client-Controlled Role

Frontend register form sends:

```text
role: "user"
```

Backend requires role from request body.

Risk:

A client can manually send:

```json
{
  "role": "admin"
}
```

Impact:

- Privilege escalation risk.

Recommended fix:

Backend should ignore role from public registration and set:

```ts
role: 'user'
```

Admin promotion should happen only through a protected admin action or maintenance script.

## Backend Issues

### 1. Redis Cache Keys Are Not Scoped By User

Cache middleware uses URL-based cache keys:

```ts
const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
```

Impact:

- User A's task/project response can be cached.
- User B can receive User A's cached data if URL matches.

Recommended fix:

Include user ID and role in cache key:

```ts
const userId = (req as any).user?.id || 'anonymous';
const role = (req as any).user?.role || 'user';
const cacheKey = `${keyPrefix}:user:${userId}:role:${role}:${req.originalUrl || req.url}`;
```

### 2. Cache Invalidation Is Incomplete

Known gaps:

- Task delete does not fully invalidate list/stats/detail cache.
- Project create/update/delete/member changes do not invalidate project cache.

Impact:

- Frontend can show stale task/project data.

Recommended fix:

Invalidate relevant cache patterns after every mutation.

### 3. Cookie Parsing Is Inconsistent

Some backend code reads:

```ts
req.cookies?.token
```

But the backend does not clearly register `cookie-parser`.

Other code manually parses `req.headers.cookie`.

Impact:

- `/auth/refresh-token` may fail to read cookies.
- Cookie behavior differs between routes.

Recommended fix:

Install/register `cookie-parser`, or use one manual cookie parsing helper everywhere.

### 4. CORS Allows Credentialed Requests Too Broadly

Backend reflects request origin when `FRONTEND_URL` is missing.

Impact:

- Risky with `Access-Control-Allow-Credentials: true`.

Recommended fix:

Use an explicit origin allowlist.

### 5. Redis Uses `KEYS`

Redis helpers use `keys(pattern)`.

Impact:

- Acceptable locally, risky in production because `KEYS` can block Redis.

Recommended fix:

Use `SCAN` or maintain cache-key indexes.

### 6. Backend Error Response Format Is Inconsistent

Some responses use:

```json
{ "error": "..." }
```

Others use:

```json
{ "success": false, "message": "..." }
```

Impact:

- Frontend error handling becomes messy.

Recommended fix:

Standardize every error response:

```json
{
  "success": false,
  "message": "Readable error",
  "errors": []
}
```

## Frontend Issues

### 1. Frontend Build Fails

Current build error:

```text
Property 'data' does not exist on type 'Task'.
```

Affected file:

```text
frontend/src/app/dashboard/tasks/[id]/edit/page.tsx
```

Cause:

Frontend code expects `data.data`, but the task query is typed/returned as `Task`.

Recommended fix:

Normalize API return types and update page usage.

### 2. Shared Types Are Empty Or Incomplete

Files exist but are empty:

```text
frontend/src/types/api.ts
frontend/src/types/auth.ts
frontend/src/types/dashboard.ts
frontend/src/types/project.ts
frontend/src/types/task.ts
```

Impact:

- Many `any` usages.
- Lint failures.
- Unclear API contracts.

Recommended fix:

Define shared frontend types based on backend contracts.

Minimum needed:

```text
ApiResponse<T>
PaginatedResponse<T>
User
Task
TaskStatus
TaskPriority
Project
ProjectMember
ProjectStatus
DashboardData
```

### 3. Empty/Duplicate Feature Files

There are empty files under:

```text
frontend/src/features/*
```

while real API logic lives under:

```text
frontend/src/services/*
```

Impact:

- Confusing structure.
- Easy to import wrong files.

Recommended fix:

Choose one:

- Keep `services/*` and remove empty `features/*`.
- Or move all logic into `features/*` and remove duplicate service structure.

### 4. Some UI Actions Are Placeholders

Examples:

```text
frontend/src/app/dashboard/tasks/[id]/page.tsx
frontend/src/app/dashboard/projects/[id]/page.tsx
```

Delete buttons contain placeholder comments instead of real mutation calls.

Impact:

- User sees delete action, but it does nothing on detail pages.

Recommended fix:

Wire delete buttons to RTK Query delete mutations and redirect to list routes.

### 5. Search And Pagination Are Not Fully Functional

Tasks page sends `search`, but backend does not support it.

Pagination buttons display but do not update page state.

Impact:

- UI suggests features that do not actually work.

Recommended fix:

- Add backend search support or make search client-side.
- Add `page` and `limit` to task filters and update them on button click.

## Integration Contract To Define

Before continuing implementation, define this contract clearly.

### Auth Contract

```text
POST /api/auth/login
  request: { email, password }
  response: { success, message, data: { user } }
  side effect: Set-Cookie token=...

GET /api/auth/me
  response: { success, data: user }

POST /api/auth/logout
  clears cookie server-side
```

### Task Contract

Recommended:

```text
GET /api/tasks
  response: { success, data: { tasks, pagination } }

GET /api/tasks/:id
  response: { success, data: task }

POST /api/tasks
  response: { success, message, data: task }

PUT /api/tasks/:id
  response: { success, message, data: task }

DELETE /api/tasks/:id
  response: { success, message }
```

### Project Contract

Recommended:

```text
GET /api/projects
  response: { success, data: projects }

GET /api/projects/:id
  response: { success, data: project }

POST /api/projects
  response: { success, message, data: project }

PUT /api/projects/:id
  response: { success, message, data: project }

DELETE /api/projects/:id
  response: { success, message }
```

## Recommended Fix Order

### Phase 1: Make Builds Stable

1. Fix frontend API response type mismatch.
2. Ensure frontend `npm.cmd run build` passes.
3. Re-run backend build to confirm it still passes.

### Phase 2: Fix Navigation

1. Update all frontend links to `/dashboard/...`.
2. Update all create/edit redirects to `/dashboard/...`.
3. Remove or create `/settings` route.

### Phase 3: Fix Auth Contract

1. Remove frontend token/localStorage logic.
2. Store only user data in Redux.
3. Ensure all requests use `credentials: 'include'`.
4. Fix backend role enrichment.
5. Prevent client-controlled role during registration.

### Phase 4: Normalize API Responses

1. Pick one response wrapper.
2. Update backend controllers.
3. Update frontend RTK Query types.
4. Add shared frontend types.

### Phase 5: Fix Security/Data Correctness

1. Scope Redis cache by user.
2. Fix cache invalidation.
3. Register cookie parser or centralize cookie parsing.
4. Add CORS allowlist.

### Phase 6: Finish UX Behavior

1. Wire detail-page delete actions.
2. Fix search.
3. Fix pagination.
4. Add useful empty/loading/error states.
5. Run lint and fix all warnings/errors.

## Full-Stack Flow After Fixes

```mermaid
flowchart TD
  A[User opens frontend] --> B[Next proxy checks token cookie]
  B -->|No cookie| C[/login]
  B -->|Cookie exists| D[/dashboard]
  C --> E[POST /api/auth/login]
  E --> F[Backend sets HTTP-only cookie]
  F --> G[Frontend calls /api/auth/me]
  G --> H[Redux stores user]
  H --> D
  D --> I[GET /api/dashboard]
  D --> J[GET /api/tasks]
  D --> K[GET /api/projects]
  J --> L[Task CRUD]
  K --> M[Project CRUD]
  L --> N[Backend invalidates user-scoped cache]
  M --> N
```

## Final Verification Checklist

Backend:

- `npm.cmd run build` passes.
- Auth routes work with cookie auth.
- Public register cannot create admin users.
- Cache keys include user scope.
- Task/project mutations invalidate cache.
- Error response format is consistent.

Frontend:

- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.
- Login redirects to dashboard.
- Refresh keeps authenticated user.
- Sidebar links do not 404.
- Task list/detail/create/edit/delete work.
- Project list/detail/create/edit/delete work.
- Profile/change-password routes work.
- Search and pagination either work or are hidden.

Full-stack:

- Frontend and backend agree on all response shapes.
- Frontend does not rely on reading HTTP-only token.
- User role behavior is consistent.
- Multi-user task/project data does not leak through cache.

