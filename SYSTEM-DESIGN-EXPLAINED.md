# System Design Concepts — Explained via the Task Management System

This project is a full-stack task management application built with **Next.js 16 + Express 5 + MongoDB + PostgreSQL + Redis**. Every major system design and computer science concept can be demonstrated with concrete code and architecture decisions from this codebase.

---

## 1. HTTP

**Code locations:** `backend/src/routes/*.ts`, `frontend/src/services/*.ts`

The project implements a **RESTful API** using every major HTTP method with semantic meaning:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/tasks` | Read-only list with filters |
| `GET` | `/api/tasks/:id` | Single resource fetch |
| `POST` | `/api/tasks` | Resource creation |
| `PUT` | `/api/tasks/:id` | Full resource update |
| `PATCH` | `/api/tasks/:id/status` | Partial update (status only) |
| `DELETE` | `/api/tasks/:id` | Resource deletion |

### Route definition with full middleware chain (`taskRoutes.ts`)
```ts
router.get('/',   rateLimit(relaxed), cache('tasks:list'), asyncHandler(taskController.getTasks));
router.post('/',  rateLimit(strict),  asyncHandler(taskController.createTask));
router.get('/:id',   rateLimit(relaxed), cache('tasks:detail'), asyncHandler(taskController.getTask));
router.put('/:id',   rateLimit(strict),  asyncHandler(taskController.updateTask));
router.patch('/:id/status', rateLimit(strict), asyncHandler(taskController.updateStatus));
router.delete('/:id', rateLimit(strict), asyncHandler(taskController.deleteTask));
```

### Key HTTP concepts demonstrated:
- **Status codes**: `200` (OK), `201` (Created), `401` (Unauthorized), `404` (Not Found), `429` (Rate Limited), `500` (Server Error)
- **Headers**: `Authorization: Bearer <JWT>` / HTTP-only cookies for auth, `Content-Type: application/json`
- **Query parameters**: `/api/tasks?status=todo&priority=high&page=1&limit=10`
- **Idempotency**: `GET`, `PUT`, `DELETE` are idempotent; `POST` is not
- **Safe methods**: `GET` is read-only with no side effects

### Client side (`services/api.ts`)
```ts
baseQuery: fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',  // sends HTTP-only cookies
}),
```

---

## 2. Threads & Processes

**Code locations:** `backend/src/server.ts`, `backend/src/utils/helpers.ts`

Node.js uses a **single-threaded event loop**. This project demonstrates both its strengths and limitations.

### Non-blocking I/O — the event loop in action
All database calls return Promises, keeping the thread free:
```ts
// server.ts — multiple async operations don't block each other
const startServer = async (): Promise<void> => {
  await connectDB();          // non-blocking
  const server = app.listen(PORT, ...);  // non-blocking
};
```

### Async error handling (`helpers.ts`)
Every route handler is wrapped to catch rejected promises and forward to the error handler:
```ts
export const asyncHandler = (fn: Function): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
```

### Graceful shutdown — process lifecycle (`server.ts`)
```ts
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  server.close();
  await mongoose.disconnect();
  await prisma.$disconnect();
  redisClient.quit();
  process.exit(0);
});
```

### Discussion points for teaching:
- **Single-threaded** means CPU-intensive operations block all requests
- **No clustering** — this app runs one process; horizontal scaling needs a load balancer
- **Stateless JWTs** enable multiple instances (no shared session memory)
- **Connection pooling** (Prisma's `pg.Pool`) manages database connections across async requests

---

## 3. Database Indexes

**Code locations:** `backend/src/models/mongodb/Task.ts`, `Project.ts`, `ActivityLog.ts`, `backend/prisma/schema.prisma`

### MongoDB indexes — 5 patterns demonstrated

| Index | Code | Query It Supports |
|-------|------|-------------------|
| **Compound** | `TaskSchema.index({ assignedTo: 1, status: 1 })` | "Find my 'in-progress' tasks" |
| **Sort** | `TaskSchema.index({ createdBy: 1, createdAt: -1 })` | "Show my tasks, newest first" |
| **Single field** | `TaskSchema.index({ dueDate: 1 })` | "Find overdue tasks" |
| **Array/multikey** | `TaskSchema.index({ tags: 1 })` | "Find tasks tagged 'urgent'" |
| **Lookup** | `TaskSchema.index({ projectId: 1 })` | "Find all tasks in project X" |

```ts
// Task.ts — full index definition
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ tags: 1 });
```

```ts
// ActivityLog.ts — time-series pattern
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1 });
```

```ts
// Project.ts — member lookup
ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ 'members.userId': 1 });
```

### PostgreSQL index (Prisma)
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique    // ← unique index on email
  name      String
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```

### Teaching value:
- Without `{ assignedTo, status }`, a query for "my in-progress tasks" scans every document
- The compound index order matters: `{ assignedTo, status }` supports queries on `assignedTo` alone, but not `status` alone
- Indexes speed reads but slow writes — the `comments` array in Task is not indexed because it's write-heavy
- MongoDB keeps "working set" (index + hot data) in RAM; indexes reduce disk I/O

---

## 4. SQL vs NoSQL

**Code locations:** `backend/src/config/database.ts`, `backend/src/models/mongodb/`, `backend/prisma/schema.prisma`

This project uses **polyglot persistence** — both systems side by side for different use cases:

| Data Store | What It Stores | Why |
|------------|----------------|-----|
| **PostgreSQL** | Users | Structured, relational, needs ACID, unique constraints, joins with other relational data |
| **MongoDB** | Tasks, Projects, ActivityLogs | Flexible schemas, nested arrays (comments, members), document fits naturally, no joins needed |
| **Redis** | Cache, rate limits, blacklisted tokens | In-memory, ephemeral, TTL-based, counters |

### Schema comparison

**SQL — User (rigid, normalized)**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```
- Fixed columns, auto-increment Int PK
- Unique constraint enforced at DB level
- Normalized — user data only here, referenced by foreign key

**NoSQL — Task (flexible, denormalized)**
```ts
const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo', 'in-progress', 'review', 'done'] },
  comments: [CommentSchema],  // ← embedded array, no join needed
  tags: [String],
  assignedTo: Number,         // ← lightweight reference
  createdBy: Number,
});
```
- Schema is flexible — fields can vary per document
- Comments are embedded (denormalized) for fast reads
- References (`assignedTo`, `createdBy`) are plain numbers, not foreign keys

### The SQL query vs document read patterns

**SQL approach (relational):** To show a task with its creator name, you'd `JOIN users ON tasks.created_by = users.id`.

**MongoDB approach:** The task document has `createdBy: 42`. If you need the name, you either:
1. Do a separate query (`User.find(42)`) — the "reference" pattern
2. Store the name in the task document — the "embed" pattern (not used here, but could be)

This is the core **SQL vs NoSQL trade-off**: consistency and normalization vs performance and flexibility.

---

## 5. Caching

**Code locations:** `backend/src/middleware/cache.ts`, `frontend/src/services/taskApi.ts`, `backend/src/config/redis.ts`

Three distinct caching layers work together:

### Layer 1: Server-side Redis cache (`cache.ts`)
```ts
export const cache = (keyPrefix: string, ttlSeconds?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();  // only cache reads

    const cacheKey = `${keyPrefix}:user:${userId}:role:${userRole}:${req.originalUrl}`;
    const cachedData = await redisHelpers.get(cacheKey);
    if (cachedData) return res.json(cachedData);  // cache HIT

    // On first miss, intercept the response to store in cache
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      redisHelpers.set(cacheKey, data, ttlSeconds);  // store for next time
      return originalJson(data);
    };
    next();
  };
};
```
- **Per-user, per-role, per-URL** keys — no cross-user data leaks
- Only caches `GET` requests (writes invalidate instead)
- TTL prevents stale data

### Layer 2: RTK Query client cache (`taskApi.ts`)
```ts
getTasks: builder.query<TasksResponse, TaskFilters>({
  query: (params) => ({ url: '/tasks', params }),
  providesTags: (result) =>
    result?.tasks?.map(t => ({ type: 'Task', id: t._id })) || [{ type: 'Task', id: 'LIST' }],
}),

createTask: builder.mutation<Task, CreateTaskRequest>({
  query: (body) => ({ url: '/tasks', method: 'POST', body }),
  invalidatesTags: [{ type: 'Task', id: 'LIST' }],  // busts the list cache
}),

updateTask: builder.mutation<Task, { id: string; body: UpdateTaskRequest }>({
  query: ({ id, body }) => ({ url: `/tasks/${id}`, method: 'PUT', body }),
  invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],  // busts individual task
}),
```
- **Tag-based invalidation**: createTask invalidates `LIST`, updateTask invalidates individual `id`
- No manual cache management — RTK Query handles it
- Refetch on focus/reconnect via `setupListeners(store.dispatch)`

### Layer 3: Rate limiting counters (`rateLimit.ts`)
```ts
const count = await redisHelpers.increment(`rate_limit:${userId}:${req.path}`, windowSeconds);
if (count > config.maxRequests) {
  return res.status(429).json({ message: 'Too many requests' });
}
```
Redis's `INCR` + TTL makes this atomic — crucial for distributed rate limiting.

---

## 6. Horizontal vs Vertical Scaling

**Code locations:** Architecture decisions throughout the project

### What enables horizontal scaling

| Feature | Implementation | Why It Helps |
|---------|---------------|--------------|
| **Stateless auth** | JWT tokens verified independently | Any instance can handle any request |
| **Shared cache** | Redis is external (Upstash) | All instances read/write same cache |
| **Managed databases** | MongoDB Atlas, Neon PostgreSQL | DB scales independently of app servers |
| **Environment config** | `.env.local` / `NODE_ENV` | Same code deploys to any environment |

### Stateless JWT — the key enabler (`authMiddleware.ts`)
```ts
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
(req as AuthRequest).user = { id: decoded.id, email: decoded.email, role: decoded.role };
```
No session store, no sticky sessions — any instance can verify any token.

### What limits horizontal scaling currently
- **No clustering** in Node.js (single process)
- **No load balancer** configuration
- **No containerization** (Dockerfile is absent)
- **Next.js SSR** requires sticky sessions or a shared session store (though JWT mitigates this)

### Vertical scaling signals
- Connection pooling (`pg.Pool` via Prisma) optimizes a single server's DB connections
- Rate limiting prevents one user from consuming all resources
- The single-process architecture is the ceiling — you'd outgrow it at ~1000 concurrent users

---

## 7. System Design Basics

**Code locations:** The entire project structure

### Three-tier architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js 16 UI   │ ──▶ │    Express API    │ ──▶ │ PostgreSQL + MongoDB │
│  (Presentation)  │     │  (Application)    │     │   + Redis (Data)    │
└──────────────────┘     └──────────────────┘     └─────────────────────┘
```

### Layered backend architecture

```
Routes (app.ts → routes/index.ts)
  │  HTTP method mapping, URL parameters
  ▼
Middleware (authMiddleware.ts, rateLimit.ts, cache.ts, logger.ts)
  │  Cross-cutting concerns: auth, throttling, caching, logging
  ▼
Controllers (taskController.ts, authController.ts)
  │  Request parsing, response formatting, no business logic
  ▼
Services (taskService.ts, authService.ts)
  │  Business logic, validation, orchestration of data access
  ▼
Data Access (Mongoose models, Prisma client, Redis helpers)
  │  Database queries, cache reads/writes
```

### Request flow — creating a task

```
1. Route: POST /api/tasks → taskRoutes.ts
2. Middleware: rateLimit(strict) → checks Redis counter
3. Middleware: authMiddleware → verifies JWT, attaches req.user
4. Controller: taskController.createTask → validates body, calls service
5. Service: taskService.createTask → writes to MongoDB
6. Service: invalidates cache keys → deletes stale Redis entries
7. Controller: returns 201 with new task JSON
8. Error handler: catches any thrown errors, returns appropriate status
```

### Key design patterns demonstrated
- **Middleware chain pattern**: Each middleware does one thing and calls `next()`
- **Service layer pattern**: Business logic isolated from HTTP concerns
- **Dependency injection (via interfaces)**: `auth-service.interface.ts` defines contracts
- **Error propagation**: Custom error handler catches everything in one place
- **Separation of concerns**: Routes → Controllers → Services → Models

---

## 8. Capacity Estimation

**Code locations:** `backend/src/middleware/rateLimit.ts`, model schemas, infrastructure config

### Rate limits as capacity ceilings (`rateLimit.ts`)
```ts
export const rateLimits = {
  strict:   { windowSeconds: 60, maxRequests: 10 },    // writes: 10/min per user
  moderate: { windowSeconds: 60, maxRequests: 30 },    // moderate: 30/min
  relaxed:  { windowSeconds: 60, maxRequests: 100 },   // reads: 100/min per user
};
```

### Data size estimation

**Task document** (derived from `Task.ts` schema):
| Field | Type | Size |
|-------|------|------|
| `_id` | ObjectId | 12 bytes |
| `title` | String (50 char avg) | ~50 bytes |
| `description` | String (500 char avg, optional) | ~500 bytes |
| `status` | Enum string | ~10 bytes |
| `priority` | Enum string | ~10 bytes |
| `assignedTo` | Number | ~8 bytes |
| `createdBy` | Number | ~8 bytes |
| `projectId` | ObjectId | ~12 bytes |
| `dueDate` | Date | ~8 bytes |
| `createdAt`/`updatedAt` | Date | ~16 bytes |
| `tags` | String[] (3 avg) | ~50 bytes |
| `comments` | Embedded doc array (5 avg) | ~1,000 bytes |
| BSON overhead | | ~200 bytes |
| **Total** | | **~1.5–2 KB** |

**Storage projection for 10,000 users × 100 tasks:**
- Tasks: 1,000,000 × 2 KB = **2 GB**
- MongoDB indexes: ~1.5× data overhead = **~3 GB**
- Activity logs (MongoDB): ~100 bytes × 100M entries = **10 GB** (TTL-expired)
- Redis cache: ~500 KB per active user × 1,000 concurrent = **~500 MB**
- PostgreSQL Users: 10,000 × 500 bytes = **~5 MB** (trivial)

### Request rate estimation
- 1,000 active users × 100 relaxed reads/day ÷ 86,400 seconds ≈ **1.2 reads/second**
- Peak (5× average): ~6 reads/second — well within single-server capacity
- Rate limits ensure no single user exceeds 100 requests/minute

---

## 9. TCP/IP Stack

**Code locations:** `backend/src/config/db.mongodb.ts`, `backend/src/config/redis.ts`, every network request

### The full stack — from browser to data

```
┌── Application Layer (HTTP/2, HTTPS) ────────────────────────────────────────┐
│  • Frontend: RTK Query fetchBaseQuery → HTTP requests to /api/*            │
│  • Backend: Express parses headers, body, query params                      │
│  • Headers: Authorization (JWT), Cookie (session), Content-Type (JSON)      │
│  • Status codes: 200, 201, 401, 404, 429, 500                              │
├── Transport Layer (TCP) ────────────────────────────────────────────────────┤
│  • Port 443: HTTPS to Next.js + Express                                     │
│  • Port 27017: MongoDB Atlas (mongodb+srv://)                               │
│  • Port 6379: Upstash Redis (rediss://)                                     │
│  • Port 5432: Neon PostgreSQL                                               │
│  • Connection pooling: pg.Pool keeps TCP connections alive                  │
│  • Timeouts: serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000         │
├── Network Layer (IP) ───────────────────────────────────────────────────────┤
│  • Vercel (Next.js) → Express server → MongoDB Atlas / Neon / Upstash      │
│  • DNS resolution for cluster addresses                                     │
├── Link & Physical ──────────────────────────────────────────────────────────┤
│  • Internet routing infrastructure                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TCP parameters in code (`db.mongodb.ts`)
```ts
await mongoose.connect(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
  tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
  serverSelectionTimeoutMS: 5000,   // TCP connect timeout
  socketTimeoutMS: 45000,           // TCP socket idle timeout
});
```

### TLS in Redis connection (`redis.ts`)
```
REDIS_URL = rediss://default:...@unique-feline-81552.upstash.io:6379
```
The `rediss://` scheme means **Redis over TLS** — TLS handshake happens after TCP handshake.

### Connection pooling (`prisma.ts`)
```ts
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
```
TCP connections are reused across requests instead of opening/closing per request — a key performance optimization.

---

## 10. Thrashing

**Code locations:** System-level resource interactions throughout the codebase

Thrashing is excessive paging/swapping when memory is overcommitted. While primarily an OS concept, this project demonstrates the software patterns that **prevent** or **trigger** thrashing-like behavior.

### What prevents resource exhaustion (anti-thrashing)

| Defense | Implementation | Analogy |
|---------|---------------|---------|
| **Rate limiting** | `rateLimit.ts` — max 100 requests/min/user | Prevents one user from consuming all CPU |
| **Connection pooling** | Prisma's `pg.Pool` with bounded size | Prevents too many database connections |
| **TTL-based cache** | Redis keys auto-expire | Prevents memory from filling with stale data |
| **Graceful shutdown** | `server.ts` — clean resource cleanup | Prevents resource leaks |
| **Timeouts** | `serverSelectionTimeoutMS: 5000` | Prevents stuck connections from accumulating |

### The MongoDB working set

MongoDB keeps frequently accessed data (working set) in RAM. When the working set exceeds RAM:

```
┌─────────────────────────────────────────┐
│         MongoDB RAM (Working Set)        │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Hot indexes  │  │  Hot documents   │  │
│  │ (assignedTo, │  │  (recent tasks,  │  │
│  │  status...)  │  │   active users)  │  │
│  └─────────────┘  └──────────────────┘  │
├─────────────────────────────────────────┤
│  Disk (Cold data, page faults)           │
│  Old tasks, inactive users               │
└─────────────────────────────────────────┘
```

Without the `{ assignedTo, status }` compound index, a query scans all documents → disk reads → high page fault rate → the database equivalent of thrashing.

### Node.js memory pressure scenario
With 1000 concurrent users hitting the unoptimized `/api/tasks` endpoint:
1. Each request starts a full collection scan (disk I/O)
2. Event loop is occupied waiting for I/O callbacks
3. New requests pile up in the event queue
4. Memory increases as objects accumulate
5. V8 garbage collector runs more frequently (CPU time) → fewer cycles for actual work
6. Throughput collapses — the application-level equivalent of thrashing

---

## 11. Google.com Request Flow

**Code locations:** `frontend/src/proxy.ts` → `backend/src/app.ts` → `backend/src/config/database.ts`

What happens when a user visits `/dashboard/tasks` — a simpler model for understanding Google-scale request flow:

```
Step 1: DNS Resolution
──────────
  User types "http://localhost:3000/dashboard/tasks"
  → Browser checks DNS cache
  → Resolves localhost to 127.0.0.1
  (At Google scale: DNS → Global load balancer → Regional data center)

Step 2: TCP + TLS Handshake
──────────
  Browser → SYN
  Server → SYN-ACK
  Browser → ACK
  → TCP connection established on port 3000
  (At Google scale: QUIC or HTTP/3 + TLS 1.3)

Step 3: Proxy/Middleware Guard
──────────
  Next.js receives the request
  → proxy.ts checks HTTP-only cookie for JWT token
  → If no token → 302 redirect to /login
  → If valid token → continue to page render
  (At Google scale: CloudFlare/AWS WAF → Auth service → Routing)

Step 4: Page Render
──────────
  Next.js renders the dashboard/tasks page
  → Server-side or client-side rendering
  → Browser executes JS bundles
  → React hydrates the page
  (At Google scale: Edge rendering + streaming SSR)

Step 5: API Call Initiation
──────────
  The TaskList component mounts
  → useGetTasksQuery() fires (RTK Query hook)
  → Checks RTK Query cache → cache HIT? Return cached data → skip API
  → Cache MISS? Fire GET /api/tasks?page=1&limit=10
  (At Google scale: Service worker → Local cache → API gateway)

Step 6: HTTP Request
──────────
  fetchBaseQuery sends:
  GET /api/tasks?page=1&limit=10 HTTP/1.1
  Host: localhost:5000
  Cookie: token=eyJhbGciOiJIUzI1NiIs...
  (At Google scale: HTTP/2 multiplexing, gRPC internally)

Step 7: Express Server (API Gateway equivalent)
──────────
  → app.ts mounts everything under /api
  → routes/index.ts matches /tasks to taskRoutes.ts
  (At Google scale: API Gateway → Service mesh → Microservice)

Step 8: Middleware Chain
──────────
  1. logger.ts → logs incoming request
  2. authMiddleware.ts → verifies JWT token
  3. rateLimit.ts → increments Redis counter, checks limit
  4. cache.ts → checks Redis for cached response
  5. asyncHandler → wraps for error propagation
  (At Google scale: Authentication → Quota check → Cache → Circuit breaker)

Step 9: Business Logic
──────────
  taskController.getTasks(req, res)
  → Extracts query params (status, priority, page, limit)
  → Calls taskService.getTasks(userId, filters)

  taskService.getTasks(userId, filters)
  → Builds MongoDB query: { assignedTo: userId, status: filters.status }
  → Applies sort: { createdAt: -1 }
  → Applies pagination: .skip(0).limit(10)
  (At Google scale: Orchestrator → Dedicated task service → Sharded database)

Step 10: Database Query
──────────
  MongoDB receives: db.tasks.find({ assignedTo: 42, status: "in-progress" })
  → Uses compound index { assignedTo: 1, status: 1 }
  → Returns matching documents from index (no collection scan)
  → Reads documents from disk or memory (working set)
  (At Google scale: Bigtable/Spanner → Distributed storage)

Step 11: Response Flow
──────────
  1. MongoDB → taskService (formats response)
  2. taskService → taskController (adds pagination metadata)
  3. cache middleware intercepts: stores response in Redis
  4. Express serializes JSON response with status 200
  5. TCP sends response back to Next.js server
  (At Google scale: Protocol Buffers → Response caching → CDN edge)

Step 12: Client-Side Update
──────────
  1. fetchBaseQuery receives JSON
  2. RTK Query stores in Redux store
  3. providesTags updates cache metadata
  4. React re-renders components with new data
  5. User sees their task list
  (At Google scale: Differential update → Virtual DOM diff → Paint)

Total time (local dev): ~50–200ms
Total time (production): ~100–500ms (add network latency)
Google.com equivalent: ~200ms–2s (across global infrastructure)
```

### The Google-scale analogy

| This Project | Google's Equivalent |
|--------------|-------------------|
| Next.js on Vercel | Global CDN + Edge servers |
| Express API | API Gateway + Service Mesh |
| MongoDB Atlas | Spanner / Bigtable |
| Redis (Upstash) | Memorystore / In-memory cache |
| JWT auth | Auth service (Google Accounts) |
| Rate limiting (Redis) | Global quota enforcement |
| Middleware chain | Interceptors + Filters |
| RTK Query cache | Service worker + Client cache |
| proxy.ts redirect | Load balancer health check |
| Error handler | Centralized error reporting |

---

## Summary: Topics Index

| Topic | Primary Code Location | Key Takeaway |
|-------|----------------------|--------------|
| HTTP | `taskRoutes.ts`, `api.ts` | RESTful design with semantic methods, status codes, headers |
| Threads & Processes | `server.ts`, `helpers.ts` | Node.js event loop, async I/O, graceful shutdown |
| Database Indexes | `Task.ts`, `schema.prisma` | Compound, sort, unique, and multikey indexes — why each matters |
| SQL vs NoSQL | `database.ts`, models | Same app, both systems — polyglot persistence driven by use case |
| Caching | `cache.ts`, `taskApi.ts` | Three layers: Redis, RTK Query tags, rate limit counters |
| Scaling | `authMiddleware.ts` | Stateless JWTs enable horizontal scaling; no clustering limits it |
| System Design | Full project structure | Three-tier + layered architecture pattern |
| Capacity Estimation | `rateLimit.ts`, schema sizes | Data sizing, request rates, storage projections from real code |
| TCP/IP Stack | `db.mongodb.ts`, `redis.ts` | TLS ports, connection pooling, timeouts — TCP parameters in production |
| Thrashing | Index design, resource limits | Without indexes → disk thrashing; rate limits → anti-thrashing |
| Google Request Flow | Full request path | 12-step end-to-end flow mapping to Google-scale equivalents |
