# System Design Concepts — Definitions &amp; Code Examples

## 1. HTTP (Hypertext Transfer Protocol)

**Definition:** A stateless, application-layer protocol for distributed, collaborative information systems. The foundation of data communication on the web. Uses a request-response model with methods (GET/POST/PUT/PATCH/DELETE), status codes, headers, and body.

**In this project:** `backend/src/routes/taskRoutes.ts` — RESTful API with semantic methods. `frontend/src/services/taskApi.ts` — client consumption via RTK Query.

| Concept | Example |
|---------|---------|
| GET (safe, idempotent) | `GET /api/tasks?status=todo` |
| POST (neither safe nor idempotent) | `POST /api/tasks` — creates new resource |
| PUT (idempotent) | `PUT /api/tasks/:id` — replaces entire resource |
| PATCH | `PATCH /api/tasks/:id/status` — partial update |
| DELETE (idempotent) | `DELETE /api/tasks/:id` — second call returns 404 |
| Status codes | 200, 201, 401, 404, 429 (rate limited), 500 |
| Headers | `Authorization: Bearer <JWT>`, `Content-Type: application/json` |
| Query params | `/api/tasks?status=todo&priority=high&page=1&limit=10` |

---

## 2. Threads & Processes

**Definition:** A **process** is an instance of a running program with its own memory space. A **thread** is the smallest unit of execution within a process — multiple threads share the same memory space. Node.js uses a **single-threaded event loop**: one thread handles all requests via asynchronous I/O (libuv), never blocking on I/O operations.

**In this project:** `backend/src/server.ts` — single process, single thread, async-first with Promises. `backend/src/utils/helpers.ts` — `asyncHandler` wraps every route to catch rejected promises.

```ts
// helpers.ts — ensures every rejected promise is caught
export const asyncHandler = (fn: Function): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
```

```ts
// server.ts — graceful shutdown, prevents resource leaks
process.on('SIGINT', async () => {
  server.close();
  await mongoose.disconnect();
  await prisma.$disconnect();
  redisClient.quit();
  process.exit(0);
});
```

**Key points:**
- Single-threaded means CPU-intensive operations block ALL requests
- No clustering — horizontal scaling needs a load balancer
- Stateless JWTs enable multiple instances (no shared session memory)

---

## 3. Database Indexes

**Definition:** A data structure (typically B-tree) that improves the speed of data retrieval operations on a database table/document collection at the cost of additional writes and storage. Without an index, the database must scan every document (COLLSCAN). With an index, it performs an index scan (IXSCAN) — orders of magnitude faster.

**In this project:** `backend/src/models/mongodb/Task.ts` — 5 indexes:

| Index Type | Definition | Query It Supports |
|------------|-----------|-------------------|
| Compound | `TaskSchema.index({ assignedTo: 1, status: 1 })` | "Find my in-progress tasks" |
| Sort | `TaskSchema.index({ createdBy: 1, createdAt: -1 })` | "Show my tasks, newest first" |
| Single field | `TaskSchema.index({ dueDate: 1 })` | "Find overdue tasks" |
| Multikey (array) | `TaskSchema.index({ tags: 1 })` | "Find tasks tagged 'urgent'" |
| Lookup | `TaskSchema.index({ projectId: 1 })` | "Find all tasks in project X" |

**PostgreSQL:** `backend/prisma/schema.prisma` — `@unique` on `email` creates a unique B-tree index.

**Key points:**
- Compound index order matters: `{ assignedTo, status }` supports queries on `assignedTo` alone but NOT `status` alone
- Indexes speed reads but slow writes (every INSERT/UPDATE must update the index)
- Use `.explain("executionStats")` — look for `IXSCAN` vs `COLLSCAN`

---

## 4. SQL vs NoSQL

**Definition:**
- **SQL** (relational) databases store data in structured tables with predefined schemas, enforce ACID transactions, support JOINs, and guarantee referential integrity via foreign keys.
- **NoSQL** (document) databases store denormalized JSON-like documents, allow flexible schemas, embed related data, and scale horizontally by sacrificing strict consistency.

**In this project:** Polyglot persistence — both systems side by side:

| Data Store | What It Stores | Why |
|------------|---------------|-----|
| **PostgreSQL** | Users | Structured, needs ACID, unique email constraint, relational |
| **MongoDB** | Tasks, Projects, ActivityLogs | Documents with embedded arrays (comments, members), flexible schema, no JOINs needed |
| **Redis** | Cache, rate limits, blacklisted tokens | In-memory, ephemeral, TTL-based, counters |

**The trade-off in action:** To show a task with the creator's name, the app does TWO queries because a cross-database JOIN is impossible:
```ts
const tasks = await Task.find(taskFilter);      // MongoDB
const users = await prisma.user.findMany();       // PostgreSQL
```

But to show a task with its comments — one query, because comments are embedded in the document.

---

## 5. Caching

**Definition:** Storing frequently accessed data in a high-speed storage layer so future requests can be served faster, reducing latency and load on the primary data store. The hardest problem in caching is **cache invalidation** — ensuring stale data isn't served after updates.

**In this project:** Three distinct caching layers:

### Layer 1: Server-side Redis cache (`backend/src/middleware/cache.ts`)
- Only caches GET requests
- Per-user, per-role, per-URL keys — no cross-user data leaks
- TTL prevents stale data (default 1 hour)
- Writes bust matching cache patterns

```ts
const cacheKey = `${keyPrefix}:user:${userId}:role:${userRole}:${req.originalUrl}`;
const cachedData = await redisHelpers.get(cacheKey);
if (cachedData) return res.json(cachedData);  // cache HIT
```

### Layer 2: RTK Query client cache (`frontend/src/services/taskApi.ts`)
- Tag-based invalidation: `providesTags` on reads, `invalidatesTags` on mutations
- `createTask` invalidates the LIST tag → next list read is fresh
- `updateTask` invalidates the individual task tag

### Layer 3: Rate limiting counters (`backend/src/middleware/rateLimit.ts`)
- Redis `INCR` + `EXPIRE` creates atomic sliding window counters
- Same Redis infrastructure, different use case

---

## 6. Horizontal vs Vertical Scaling

**Definition:**
- **Vertical scaling** (scale up) = adding more power (CPU, RAM, disk) to an existing server. Simple but has a ceiling (max hardware available).
- **Horizontal scaling** (scale out) = adding more servers behind a load balancer. Requires stateless design and shared infrastructure. Theoretically unlimited.

**In this project:**

### What enables horizontal scaling:
| Feature | Implementation | Why It Helps |
|---------|---------------|-------------|
| **Stateless auth** | JWT tokens verified independently (`authMiddleware.ts`) | Any instance can handle any request |
| **Shared cache** | Redis is external (Upstash) | All instances read/write same cache |
| **Managed databases** | MongoDB Atlas, Neon PostgreSQL | DB scales independently of app servers |
| **Environment config** | `.env` files | Same code deploys to any environment |

```ts
// authMiddleware.ts — stateless JWT verification
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
(req as AuthRequest).user = { id: decoded.id, email: decoded.email, role: decoded.role };
```

### What limits horizontal scaling currently:
- No clustering in Node.js (single process)
- No load balancer configuration
- No containerization (Dockerfile absent)
- Prisma connection pool caps concurrent DB connections per server

---

## 7. System Design Basics

**Definition:** The process of defining the architecture, components, modules, interfaces, and data flow of a system to satisfy specified requirements. Common patterns include **three-tier architecture** (presentation → application → data) and **layered architecture** where each layer has one responsibility.

**In this project:**

### Three-tier architecture:
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Next.js 16 UI   │ ──▶ │    Express API    │ ──▶ │ PostgreSQL + MongoDB │
│  (Presentation)  │     │  (Application)    │     │   + Redis (Data)    │
└──────────────────┘     └──────────────────┘     └──────────────────────┘
```

### Layered backend architecture:
```
Routes → Middleware → Controllers → Services → Data Access
```
Each layer has one responsibility — changing the database doesn't change the route.

### Key design patterns:
- **Middleware chain pattern**: Each middleware does one thing and calls `next()`
- **Service layer pattern**: Business logic isolated from HTTP concerns
- **Error propagation**: One error handler catches everything
- **Separation of concerns**: Routes → Controllers → Services → Models

### Request flow — creating a task:
1. Route: `POST /api/tasks` → `taskRoutes.ts`
2. Middleware: `rateLimit(strict)` → checks Redis counter
3. Middleware: `authMiddleware` → verifies JWT, attaches `req.user`
4. Controller: `taskController.createTask` → validates body, calls service
5. Service: `taskService.createTask` → writes to MongoDB
6. Service: invalidates cache keys → deletes stale Redis entries
7. Controller: returns 201 with new task JSON

---

## 8. Capacity Estimation

**Definition:** Predicting the resources (storage, bandwidth, CPU, memory, network) a system will need at different usage scales. Used to choose infrastructure, set rate limits, plan for growth, and avoid over- or under-provisioning.

**In this project:**

### Task document size (~1.9 KB):
| Field | Size |
|-------|------|
| `_id` (ObjectId) | 12 B |
| `title` (50 char avg) | ~50 B |
| `description` (500 char avg) | ~500 B |
| `status` + `priority` (enums) | ~20 B |
| `assignedTo` + `createdBy` (Number) | ~16 B |
| `dueDate`, `createdAt`, `updatedAt` | ~24 B |
| `tags` (3 avg) | ~50 B |
| `comments` (5 avg × 200 B) | ~1,000 B |
| BSON overhead | ~200 B |

### Storage projection:
| Users | Tasks | Storage |
|-------|-------|---------|
| 100 | 10,000 | ~107 MB |
| 1,000 | 100,000 | ~676 MB |
| 10,000 | 1,000,000 | ~6.2 GB |
| 100,000 | 10,000,000 | ~59 GB |

### Rate limits as capacity ceilings (`rateLimit.ts`):
```ts
strict:   { windowSeconds: 60, maxRequests: 10 },   // writes
relaxed:  { windowSeconds: 60, maxRequests: 100 },  // reads
```

For 1,000 active users: ~0.7 req/s average, ~3.5 req/s peak — one server handles it easily.

---

## 9. TCP/IP Stack

**Definition:** A 4-layer networking model that governs how data travels across networks:
- **Application (Layer 7):** HTTP, HTTPS — the data format
- **Transport (Layer 4):** TCP — reliable, connection-oriented, port-based
- **Network (Layer 3):** IP — routing, addressing, packets
- **Link (Layer 2):** Physical hardware, MAC addresses

Every HTTP request starts with a **TCP 3-way handshake** (SYN → SYN-ACK → ACK).

**In this project:**

### Ports and protocols:
| Service | Port | Protocol |
|---------|------|----------|
| Next.js (frontend) | 3000 | HTTP |
| Express (backend) | 5000 | HTTP |
| MongoDB Atlas | 27017 | MongoDB wire protocol over TLS |
| Upstash Redis | 6379 | Redis over TLS (`rediss://`) |
| Neon PostgreSQL | 5432 | PostgreSQL wire protocol |

### TCP parameters in code (`backend/src/config/db.mongodb.ts`):
```ts
await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,   // TCP connect timeout
  socketTimeoutMS: 45000,           // TCP socket idle timeout
  tls: true,                        // TLS handshake after TCP
});
```

### Connection pooling (`backend/src/config/prisma.ts`):
```ts
const pool = new Pool({ connectionString: DATABASE_URL, max: 20 });
```
TCP connections are reused across requests instead of opened/closed per query — critical for performance.

---

## 10. Thrashing

**Definition:** A condition where a system spends more time managing resources (paging, swapping, context-switching) than doing actual work. Throughput collapses. In databases: when the working set exceeds RAM, every query causes disk page faults → the database equivalent of thrashing.

**In this project — 5 defenses:**

| Defense | Implementation | Anti-Thrashing Mechanism |
|---------|---------------|-------------------------|
| **Rate limiting** | `rateLimit.ts` — max 100 req/min/user | Prevents one user from consuming all CPU |
| **Connection pooling** | Prisma's `pg.Pool` with bounded size | Prevents too many concurrent DB connections |
| **Database indexes** | `Task.ts` — `{ assignedTo, status }` compound index | Prevents full collection scans → disk thrashing |
| **TTL-based cache** | Redis keys auto-expire | Prevents memory from filling with stale data |
| **Graceful shutdown** | `server.ts` — clean resource cleanup | Prevents file descriptor leaks over time |

### How it works:
Without the `{ assignedTo, status }` index, a query like `db.tasks.find({ assignedTo: 42, status: "in-progress" })` would scan every document (COLLSCAN). With 1M tasks, that's reading 1M documents from disk → massive page fault rate → MongoDB spends all its time moving data from disk to RAM instead of serving results.

### Application-level thrashing scenario:
1. 1000 concurrent users hit an unoptimized endpoint
2. Each request does a full collection scan (disk I/O)
3. Event loop is occupied waiting for I/O callbacks
4. New requests pile up in the event queue
5. Memory increases as objects accumulate
6. V8 garbage collector runs more frequently (CPU overhead)
7. Throughput collapses

---

## 11. Google.com Request Flow

**Definition:** The complete end-to-end journey of a web request from URL entry to pixels on screen, passing through DNS, TCP/TLS, load balancers, middleware (auth, rate limiting, caching), application logic, databases, and client-side rendering. Understanding this flow reveals how every component of a distributed system connects and interacts.

**In this project — 12-step trace** (a user visits `/dashboard/tasks`):

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1 | DNS resolves `localhost` → `127.0.0.1` | OS DNS resolver |
| 2 | TCP 3-way handshake on port 3000 | OS kernel |
| 3 | Next.js receives request, matches route | Next.js router |
| 4 | `proxy.ts` checks JWT cookie → redirects if missing | `frontend/src/proxy.ts` |
| 5 | Page renders, React hydrates, TaskList mounts | Next.js SSR |
| 6 | `useGetTasksQuery()` fires, checks RTK cache | `frontend/src/services/taskApi.ts` |
| 7 | HTTP request sent: `GET /api/tasks?page=1` | `fetchBaseQuery` |
| 8 | CORS check — browser verifies cross-origin headers | `backend/src/app.ts` |
| 9 | Middleware chain: logger → auth → rate limit → cache | Various middleware files |
| 10 | Controller + Service: builds query, calls MongoDB | `taskController.ts` / `taskService.ts` |
| 11 | MongoDB uses compound index, returns results | `Task.ts` indexes |
| 12 | Response flows back, updates Redux, React re-renders | RTK Query → React |

### Google-scale mapping:
| This Project | Google's Equivalent |
|--------------|-------------------|
| Next.js on localhost:3000 | Global CDN + Edge servers |
| `proxy.ts` auth guard | Cloud Armor (WAF) + Identity-Aware Proxy |
| Express on localhost:5000 | API Gateway + Service Mesh (Istio) |
| `authMiddleware.ts` | Google Auth Service (OAuth 2.0) |
| `rateLimit.ts` (Redis) | Global Quota Service |
| `cache.ts` (Redis) | Distributed cache (Memcache) |
| `taskService.ts` | Task microservice (dedicated, independently scaled) |
| MongoDB Atlas | Spanner / Bigtable |
| Upstash Redis | Memorystore |
| RTK Query (client cache) | Service Worker + Workbox |
| `errorHandler.ts` | Centralized error reporting (Sentry) |
| Graceful shutdown | Kubernetes pod lifecycle |

---

## Summary

| # | Topic | Definition | Key Code Location |
|---|-------|-----------|------------------|
| 1 | **HTTP** | Stateless request-response protocol for web communication | `taskRoutes.ts`, `taskApi.ts` |
| 2 | **Threads & Processes** | Single-threaded event loop vs multi-process architecture | `server.ts`, `helpers.ts` |
| 3 | **Database Indexes** | B-tree data structures that accelerate queries | `Task.ts`, `schema.prisma` |
| 4 | **SQL vs NoSQL** | Relational (structured, ACID) vs document (flexible, embedded) | `database.ts`, models |
| 5 | **Caching** | Storing data in faster storage to reduce latency | `cache.ts`, `taskApi.ts`, `rateLimit.ts` |
| 6 | **Scaling** | Vertical (bigger server) vs horizontal (more servers) | `authMiddleware.ts` |
| 7 | **System Design** | Architecture patterns: three-tier, layered, middleware chain | Full project structure |
| 8 | **Capacity Estimation** | Predicting resource needs at different scales | `rateLimit.ts`, schema sizes |
| 9 | **TCP/IP Stack** | 4-layer networking: Application → Transport → Network → Link | `db.mongodb.ts`, `redis.ts` |
| 10 | **Thrashing** | Resource exhaustion where overhead dominates useful work | Index design, rate limits |
| 11 | **Google Flow** | End-to-end request journey at every scale | Full request path |
