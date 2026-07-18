# Interview Q&amp;A — System Design &amp; This Project

## 1. HTTP

**Q: What's the difference between PUT and PATCH? When would you use each?**

A: PUT replaces the entire resource — if you omit a field, it's cleared. PATCH applies a partial update — only the specified fields change. In this project, `PUT /api/tasks/:id` replaces the whole task, while `PATCH /api/tasks/:id/status` updates only the status field. PUT is idempotent (calling it 10× with the same body gives the same result). PATCH is not necessarily idempotent.

---

**Q: Why is GET considered "safe" and "idempotent"?**

A: Safe means it has no side effects — no data is created, modified, or deleted. Idempotent means calling it 10× produces the same result as calling it once. In this project, `GET /api/tasks` only reads data — it never modifies the database. This is why only GET requests are cached in `backend/src/middleware/cache.ts:13` where it checks `if (req.method !== 'GET') return next()`.

---

**Q: What HTTP status codes does this project use and what do they mean?**

A:
- `200 OK` — successful GET/PUT/PATCH/DELETE
- `201 Created` — successful POST (resource created)
- `400 Bad Request` — validation error on input
- `401 Unauthorized` — missing or invalid JWT (handled in `authMiddleware.ts`)
- `404 Not Found` — resource doesn't exist (e.g., invalid task ID)
- `429 Too Many Requests` — rate limit exceeded (`rateLimit.ts`)
- `500 Internal Server Error` — unhandled exception (caught by `errorHandler.ts`)

---

## 2. Threads & Processes

**Q: How does Node.js handle thousands of concurrent requests with a single thread?**

A: Node.js uses an event loop backed by libuv. I/O operations (database queries, file reads, network calls) return Promises and are offloaded to the OS kernel or thread pool. The event loop continues processing other requests while waiting for I/O to complete. In this project, every database call is async — `Task.find()`, `prisma.user.findMany()`, `redisHelpers.get()` all return Promises. The `asyncHandler` in `helpers.ts` ensures every rejected promise is caught and forwarded to the error handler.

---

**Q: What would happen if you put a CPU-intensive operation in a route handler?**

A: It would block the entire event loop — every other user's request would wait. For example, a `while` loop that takes 10 seconds would freeze all concurrent requests. This is why CPU-heavy work should be offloaded to worker threads or a separate service. This project avoids this by making all handlers async and keeping business logic in services (`taskService.ts`, `authService.ts`).

---

**Q: How does graceful shutdown work in this project and why is it important?**

A: In `backend/src/server.ts`, the app listens for `SIGINT` (Ctrl+C) and:
1. Stops accepting new requests (`server.close()`)
2. Disconnects MongoDB gracefully
3. Disconnects PostgreSQL (Prisma)
4. Quits the Redis client

Without this, connections would be terminated abruptly, potentially corrupting data or leaking connections. It's especially important with connection pools — abrupt termination leaves "zombie" connections on the database server.

---

## 3. Database Indexes

**Q: What's a compound index and why does the order of fields matter?**

A: A compound index indexes multiple fields together in a specified order. In `Task.ts`, the index `{ assignedTo: 1, status: 1 }` stores documents sorted first by `assignedTo`, then by `status` within each `assignedTo` group. This means:
- It supports queries on `assignedTo` alone (prefix match)
- It supports queries on both `assignedTo` AND `status`
- It does NOT support queries on `status` alone (not a prefix)

The index supports the most common query: "find my tasks by status."

---

**Q: How would you verify that an index is being used?**

A: Use MongoDB's `explain()` method:
```js
db.tasks.find({ assignedTo: 1, status: "in-progress" }).explain("executionStats")
```
Look for `"stage": "IXSCAN"` (index scan) vs `"stage": "COLLSCAN"` (collection scan). `IXSCAN` means the index is working. You can also check `totalDocsExamined` — with an index it should equal the number of matching documents; without one, it equals the total documents in the collection.

---

**Q: What's the trade-off of adding too many indexes?**

A: Indexes speed up reads but slow down writes. Every INSERT, UPDATE, or DELETE must update every relevant index. If a task has 5 indexes, inserting one task requires updating all 5 B-trees plus the document itself. This is why the `comments` array in Task is not indexed — it's write-heavy and rarely queried independently.

---

## 4. SQL vs NoSQL

**Q: Why does this project use both PostgreSQL and MongoDB instead of just one?**

A: This is polyglot persistence — using the right database for each use case:
- **PostgreSQL for Users** — needs ACID transactions, unique email constraint enforced at database level, structured relational data with clear schema
- **MongoDB for Tasks/Projects** — documents naturally contain embedded arrays (comments in tasks, members in projects). Reading a task with its comments is one query instead of a JOIN. Schema flexibility allows optional fields.
- **Redis for cache/rate limits** — in-memory, ephemeral data with TTL, counters

---

**Q: What's the problem with having users in PostgreSQL and tasks in MongoDB?**

A: You can't do a cross-database JOIN. To show a task with its creator's name, the code must make two separate queries — one to MongoDB for tasks, one to PostgreSQL for users — and join them in application code. This is visible in `taskService.ts` where it queries MongoDB for tasks, then queries Prisma for user data. There's no foreign key enforcement either — `assignedTo: 99999` in a task won't error even if user 99999 doesn't exist.

---

**Q: When would you embed data vs reference it in MongoDB?**

A: Embed when the related data is always read together and doesn't grow unbounded (e.g., comments in a task — always shown with the task, typically < 100). Reference when the related data is large, independent, or shared (e.g., the user who created the task — referenced via `createdBy` number, not embedded). This project embeds comments and references users — the right choice for each case.

---

## 5. Caching

**Q: What are the three caching layers in this project and how do they interact?**

A:
1. **RTK Query client cache** — avoids network requests entirely. Tag-based: `providesTags` on reads, `invalidatesTags` on mutations. `createTask` invalidates the `Task` tag, triggering a fresh fetch.
2. **Redis server cache** — avoids database queries. Only caches GET requests with per-user, per-role, per-URL keys. Writes bust matching patterns (`tasks:list:*`, `tasks:stats:*`).
3. **Rate limiting counters** — uses Redis INCR + TTL for sliding window counters. Not a cache in the traditional sense, but uses the same infrastructure.

If Redis is down, layers 2 and 3 degrade gracefully — the app still works, just without caching or rate limiting.

---

**Q: How does cache invalidation work when a task is updated?**

A: In `taskService.ts`, after `createTask`, the code calls:
```ts
await redisHelpers.deletePattern('tasks:list:*');
await redisHelpers.deletePattern('tasks:stats:*');
```
This deletes ALL cached task lists and stats so the next GET fetches fresh data. On the frontend, `createTask` mutation has `invalidatesTags: [{ type: 'Task', id: 'LIST' }]`, which tells RTK Query to refetch the task list. Double invalidation — both server and client caches are busted.

---

**Q: Why are cache keys scoped per user and per role?**

A: Because different users and roles see different data. An admin sees all tasks; a regular user sees only their own tasks. Without user/role scoping, user A might see user B's cached data — a security leak. The key format is:
```
tasks:list:user:{id}:role:{role}:{originalUrl}
```
This ensures cache isolation between users. Defined in `backend/src/middleware/cache.ts`.

---

## 6. Horizontal vs Vertical Scaling

**Q: What makes this project horizontally scalable?**

A: Three things:
1. **Stateless JWT auth** — any instance can verify any token without shared session state (`authMiddleware.ts`)
2. **Shared Redis** — all instances read/write the same cache and rate limit counters
3. **Managed databases** — MongoDB Atlas and Neon PostgreSQL scale independently

You could add 10 servers behind a load balancer and they'd all work without changes.

---

**Q: What limits this project's horizontal scaling today?**

A:
- **No clustering** — runs as a single Node.js process
- **No load balancer** — no distribution of traffic
- **No containerization** — no Docker/Kubernetes config
- **Connection pool limits** — each server instance uses up to 10 MongoDB connections and 20 PostgreSQL connections. Too many instances = too many database connections

---

**Q: Why is stateless auth (JWT) considered the #1 requirement for horizontal scaling?**

A: With session-based auth, the server stores session data in memory. If you have 3 servers, a user might log in on server 1 but their next request goes to server 2 — which doesn't have their session. You need sticky sessions or a shared session store. JWTs solve this: the token itself contains all the info needed to verify identity. Any server can verify it independently using the shared secret. No shared state needed. This is exactly how `authMiddleware.ts` works — it decodes the JWT from the cookie header, no database lookup required.

---

## 7. System Design Basics

**Q: Describe the architecture of this project.**

A: It follows the **three-tier architecture**:
- **Presentation tier**: Next.js 16 with React 19, Tailwind CSS, RTK Query for state management, TypeScript
- **Application tier**: Express 5 with layered middleware (auth, rate limiting, caching, logging), controllers (HTTP handlers), services (business logic)
- **Data tier**: PostgreSQL (Prisma ORM), MongoDB (Mongoose ODM), Redis (Upstash)

The backend follows a strict layered pattern: Routes → Middleware → Controllers → Services → Data Access. Each layer has one responsibility.

---

**Q: Walk me through the complete request flow for GET /api/tasks.**

A:
1. Browser sends `GET /api/tasks` (Next.js proxies to Express)
2. Express routes to `taskRoutes.ts`
3. Middleware chain: `logger` (logs request) → `authMiddleware` (verifies JWT) → `rateLimit` (checks Redis counter) → `cache` (checks Redis for cached response) → `asyncHandler` (error wrapper)
4. `taskController.getTasks()` extracts query params (status, priority, page, limit)
5. `taskService.getTasks()` builds MongoDB query with filters, applies sort + pagination
6. MongoDB query uses compound index `{ assignedTo: 1, status: 1 }`
7. Response flows back through cache middleware (stores in Redis on miss)
8. Back to browser, RTK Query updates Redux store, React re-renders

---

**Q: What design patterns are used in this project?**

A:
- **Middleware chain pattern**: Each middleware does one thing and calls `next()`
- **Service layer pattern**: Business logic isolated from HTTP concerns
- **Dependency injection (via interfaces)**: `AuthService.interface.ts` defines contracts
- **Error propagation**: `errorHandler.ts` catches everything in one place
- **Async wrapper**: `asyncHandler` wraps all route handlers for consistent error handling
- **Repository pattern**: MongoDB models and Prisma client abstract data access

---

## 8. Capacity Estimation

**Q: How much storage would 1 million tasks require?**

A: Each task document is about 1.9 KB. For 1 million tasks:
- Data: ~1.9 GB
- Indexes: ~2.8 GB (roughly 1.5× data overhead)
- Total MongoDB storage: ~4.7 GB

Activity logs would add more (~1 GB for 10M entries at 100 bytes each). Redis cache for 1,000 concurrent users: ~500 MB. PostgreSQL users: ~5 MB for 10K users. Total system: ~6-7 GB.

---

**Q: How many requests per second can this project handle?**

A: Based on the rate limits in `rateLimit.ts`:
- Writes: 10/min/user
- Reads: 100/min/user

For 1,000 active users:
- Daily reads: 1,000 × 50 = 50,000
- Daily writes: 1,000 × 10 = 10,000
- Total: 60,000/day ≈ 0.7 req/s average
- Peak (5×): ~3.5 req/s

A single server handles this easily. The bottleneck would be MongoDB connection pool (10 concurrent ops by default) and Node.js event loop saturation.

---

**Q: If this project grew to 100,000 users, what would break first?**

A: The Node.js single process would saturate around 1,000-2,000 concurrent users. MongoDB connection pool would be a bottleneck (10 concurrent connections). The solution: horizontal scaling (multiple Node.js instances), increase MongoDB `maxPoolSize`, add a load balancer, and implement read replicas for MongoDB.

---

## 9. TCP/IP Stack

**Q: What happens at the TCP level when a user makes a request to this app?**

A:
1. Browser initiates a TCP 3-way handshake with the server on port 3000 (Next.js) or 5000 (Express):
   - Browser → SYN
   - Server → SYN-ACK
   - Browser → ACK
2. TCP connection established
3. HTTP request is sent over the TCP connection as data packets
4. Server processes and sends HTTP response
5. Connection may be reused (keep-alive) or closed

The downstream connections (Express → MongoDB/PostgreSQL/Redis) use their own TCP connections, managed by connection pools.

---

**Q: What is connection pooling and why is it used?**

A: Connection pooling maintains a set of persistent TCP connections to a database that are reused across requests. Opening a new TCP connection for every query is expensive (DNS resolution, TCP handshake, TLS handshake). In this project, Prisma uses `pg.Pool` for PostgreSQL and Mongoose uses `maxPoolSize` for MongoDB. Connections are borrowed from the pool, used for a query, and returned — never closed. This reduces latency and prevents connection exhaustion.

---

**Q: What does `rediss://` mean and why is it important?**

A: `rediss://` is Redis over TLS. It means:
1. TCP 3-way handshake to establish the connection
2. TLS handshake (2 round trips — certificate exchange, key agreement)
3. Then encrypted data flows over the TCP connection

This adds latency to the initial connection but ensures all data is encrypted in transit. Used in this project because Redis (Upstash) is a cloud service — data must be encrypted over the public internet.

---

## 10. Thrashing

**Q: What is thrashing in the context of databases?**

A: Thrashing occurs when the database's working set (hot data + indexes) exceeds available RAM. The database constantly pages data between RAM and disk — spending more time on I/O than on actual query processing. Without proper indexes, every query does a full collection scan, reading millions of documents from disk. Throughput collapses.

---

**Q: How does this project prevent thrashing?**

A: Five defenses:
1. **Rate limiting** (`rateLimit.ts`) — prevents request overload that would saturate the event loop
2. **Database indexes** (`Task.ts`) — compound index `{ assignedTo, status }` prevents full collection scans
3. **Connection pooling** (`prisma.ts`) — limits concurrent database connections to prevent memory pressure
4. **TTL-based cache** (`redis.ts`) — keys auto-expire, preventing unbounded memory growth
5. **Graceful shutdown** (`server.ts`) — prevents file descriptor leaks that accumulate over time

---

**Q: What happens if MongoDB's working set exceeds available RAM?**

A: MongoDB starts evicting pages from RAM back to disk. If the working set is too large, it constantly evicts and re-reads pages (page faults). The `pageFaults` counter in `serverStatus` spikes. Query latency goes from microseconds to milliseconds or seconds. This is the database equivalent of OS thrashing. The fix: add more RAM, use better indexes (so queries touch fewer pages), or shard the data across multiple servers.

---

## 11. Google.com Request Flow

**Q: Walk me through what happens when a user visits /dashboard/tasks in this project, and map each step to a Google-scale equivalent.**

A:

| Step | This Project | Google-Scale Equivalent |
|------|-------------|------------------------|
| 1. DNS resolution | `localhost` → `127.0.0.1` | DNS → Global load balancer |
| 2. TCP handshake | Port 3000, 3-way handshake | QUIC/HTTP/3 (faster than TCP) |
| 3. Auth guard | `proxy.ts` checks JWT cookie | Cloud Armor WAF + IAP |
| 4. Page render | Next.js SSR, React hydration | Edge rendering + streaming SSR |
| 5. API call | `useGetTasksQuery()` → RTK cache check | Service worker → Cache API |
| 6. HTTP request | `GET /api/tasks` to Express | API Gateway → Service mesh |
| 7. Middleware | auth → rate limit → cache | Auth → Quota → Cache services |
| 8. Business logic | Controller → Service (taskService.ts) | Orchestrator → Microservice |
| 9. Database query | MongoDB with compound index | Spanner/Bigtable with distributed indexes |
| 10. Response | Cache middleware stores in Redis | CDN edge caches response |
| 11. Client update | Redux store update → React re-render | Virtual DOM diff → Paint |

---

**Q: How would you add a new feature (like Task Categories) following the same architecture?**

A:
1. **Database** — Add `category` field to `Task.ts` schema (MongoDB)
2. **Backend route** — Add `/api/categories` to `taskRoutes.ts`
3. **Backend controller** — Add `taskController.getCategories()`
4. **Backend service** — Add `taskService.getCategories()` with business logic
5. **Frontend API** — Add `getCategories` endpoint to `taskApi.ts`
6. **Frontend component** — Create `CategoryList.tsx`
7. **Middlewares** — Auth, rate limit, and cache the new endpoint
8. **Test** — Create a task with a category, verify persistence

This is the same pattern Google uses — just at a different scale.
