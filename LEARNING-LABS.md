# System Design — Hands-On Labs

Step-by-step exercises using this project to learn each concept by doing.

---

## Lab 1: HTTP — Trace a Request from Browser to Database

**Goal:** Follow one HTTP request through every layer and see how methods, status codes, and headers work.

### Step 1: Read the route definition
Open `backend/src/routes/taskRoutes.ts` and find:
```ts
router.post('/', rateLimit(strict), asyncHandler(taskController.createTask));
```

### Step 2: Find how the frontend calls it
Open `frontend/src/services/taskApi.ts` and find the `createTask` endpoint:
```ts
createTask: builder.mutation<Task, CreateTaskRequest>({
  query: (body) => ({
    url: '/tasks',
    method: 'POST',
    body,
  }),
})
```

### Step 3: Trace the full flow
```
LoginForm.tsx → login button click
  → useLoginMutation() → fetchBaseQuery
    → POST http://localhost:5000/api/auth/login  (HTTP method + URL)
      → Headers: Content-Type, Cookie
      → Body: { email, password }
        → Express receives request
          → authMiddleware checks JWT
          → rateLimit checks Redis counter
          → authController.login()
            → authService.login() queries PostgreSQL
            → Sets HTTP-only cookie in response
            → Returns JSON with status 200
```

### Exercise: Add a new HTTP method
1. Open `backend/src/routes/taskRoutes.ts`
2. Add a `PATCH` route for bulk status update: `router.patch('/bulk-status', ...)`
3. Create the controller method
4. Add the endpoint to `frontend/src/services/taskApi.ts`
5. Run `npm run dev` and test it

### Exercise: See status codes in action
1. Call `GET http://localhost:5000/api/tasks/invalid-id` — see 404
2. Call without auth token — see 401
3. Call rate-limited endpoint 11 times in 60s — see 429
4. Check `backend/src/middleware/errorHandler.ts` to see how different errors map to status codes

### Key takeaways
- `GET` is **safe** (no side effects) and **idempotent** (calling it 10x = same result)
- `POST` is **neither** — creates a new resource each time
- `PUT` replaces the entire resource (idempotent)
- `PATCH` updates partial fields
- `DELETE` removes (idempotent — deleting twice returns 404, not an error)

---

## Lab 2: Threads & Processes — See the Event Loop in Action

**Goal:** Understand how Node.js handles thousands of concurrent requests with a single thread.

### Step 1: See the single thread
Add this to `backend/src/server.ts` inside `startServer()`:
```ts
console.log('Server running on PID:', process.pid);
console.log('Single thread?', process.features?.uv ? 'Yes (libuv)' : 'Check');
```

### Step 2: Block the event loop
Create a test file `backend/src/test-blocking.ts`:
```ts
import express from 'express';
const app = express();
app.get('/block', (req, res) => {
  const start = Date.now();
  while (Date.now() - start < 10000) {}  // Block for 10 seconds
  res.send('Done blocking');
});
app.get('/fast', (req, res) => res.send('Fast!'));
app.listen(5001);
```

Run it, then open two browser tabs:
- Tab 1: `http://localhost:5001/block` — hangs for 10s
- Tab 2: `http://localhost:5001/fast` — also hangs!

This proves Node.js has **one thread**. The `while` loop blocks everything.

### Step 3: Fix with async (how this project does it)
Look at `backend/src/utils/helpers.ts`:
```ts
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```
Every route is wrapped — database calls return Promises, freeing the thread.

### Step 4: Check graceful shutdown
Open `backend/src/server.ts` and find:
```ts
process.on('SIGINT', async () => {
  server.close();
  await mongoose.disconnect();
  await prisma.$disconnect();
  redisClient.quit();
  process.exit(0);
});
```
This ensures no connections leak when the server stops.

### Exercise: Run a load test
```bash
npm install -g artillery
artillery quick --count 20 --num 10 http://localhost:5000/api/tasks
```
Then check the rate limit counters in Redis (via `/dashboard/learning`).

### Key takeaways
- Node.js is **single-threaded** but **non-blocking** via libuv
- CPU-heavy work blocks ALL requests — offload to worker threads
- This project is **async-first** — every DB call returns a Promise
- The event loop handles thousands of concurrent I/O operations
- **Horizontal scaling** (more servers) > vertical scaling (more CPU) for this app

---

## Lab 3: Database Indexes — Create, Compare, Optimize

**Goal:** See how indexes change query performance from "slow" to "instant."

### Step 1: See the existing indexes
Open `backend/src/models/mongodb/Task.ts` lines 70-74:
```ts
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ tags: 1 });
```

### Step 2: Understand why each index exists
Open `backend/src/services/taskService.ts` lines 57-73:
```ts
const query: any = {
  $or: [{ assignedTo: userId }, { createdBy: userId }],
};
if (filters.status) query.status = filters.status;
if (filters.priority) query.priority = filters.priority;
if (filters.projectId) query.projectId = filters.projectId;
```

The compound index `{ assignedTo: 1, status: 1 }` supports the most common query: "find my tasks by status."

### Step 3: Measure query performance
Open MongoDB Compass or `mongosh`:
```js
// Before index — full collection scan
db.tasks.find({ assignedTo: 1, status: "in-progress" }).explain("executionStats")
// Look for: "COLLSCAN" — bad, scans every document

// Add index
db.tasks.createIndex({ assignedTo: 1, status: 1 })

// After index — index scan
db.tasks.find({ assignedTo: 1, status: "in-progress" }).explain("executionStats")
// Look for: "IXSCAN" — good, only scans relevant documents
```

### Step 4: See it in the codebase
- **Compound index**: `{ assignedTo: 1, status: 1 }` — queries on both fields
- **Sort index**: `{ createdBy: 1, createdAt: -1 }` — "my tasks, newest first"
- **Unique index**: Prisma `email String @unique` — prevents duplicate emails
- **Array/multikey index**: `{ tags: 1 }` — queries where any tag matches

### Exercise: Add a missing index
1. The `priority` filter is in the service code but has no index
2. Add: `TaskSchema.index({ assignedTo: 1, priority: 1 })`
3. Verify in Compass that queries filter by priority now use IXSCAN

### Exercise: Compare SQL vs NoSQL indexes
**PostgreSQL (Prisma):** Open `backend/prisma/schema.prisma`:
```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique  // ← B-tree index created automatically
}
```

Run `npx prisma studio` to see the database visually.

**MongoDB:** Indexes are defined in the schema file (`Task.ts`). They're created when the app starts.

### Key takeaways
- Without the right index, every query is a **full collection scan** (COLLSCAN)
- Compound indexes support queries on **any prefix** of the indexed fields
- Indexes speed up **reads** but slow down **writes** — each INSERT/UPDATE must update the index
- Check index usage with `.explain("executionStats")` — look for `IXSCAN` vs `COLLSCAN`

---

## Lab 4: SQL vs NoSQL — Compare Both in Action

**Goal:** Understand why this project uses both PostgreSQL AND MongoDB, and when to choose each.

### Step 1: See both databases connected
Open `backend/src/config/database.ts`:
```ts
// Both databases connect at startup
await connectPostgreSQL();
await connectMongoDB();
```

### Step 2: Compare the data models side by side

**PostgreSQL — User (SQL, relational):**
`backend/prisma/schema.prisma`:
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique     // ← Enforced at DB level
  name      String
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```
- Fixed schema, auto-increment ID, unique constraints
- Would use JOINs to link with tasks if tasks were also in SQL

**MongoDB — Task (NoSQL, document):**
`backend/src/models/mongodb/Task.ts`:
```ts
const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo', 'in-progress', 'review', 'done'] },
  comments: [CommentSchema],   // ← Embedded array, NO join needed
  tags: [String],
  assignedTo: Number,           // ← Lightweight reference, not a foreign key
  createdBy: Number,
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
});
```
- Flexible schema — fields can vary per document
- Embedded arrays — no JOINs needed for comments
- References are plain numbers, not enforced foreign keys

### Step 3: See the trade-off in action

**SQL query (relational):** To show a task with the creator's name:
```sql
SELECT tasks.*, users.name
FROM tasks
JOIN users ON tasks.created_by = users.id;
```
In this project, tasks are in MongoDB and users are in PostgreSQL — so this JOIN is IMPOSSIBLE. The code does TWO queries instead:
```ts
const tasks = await Task.find(taskFilter);  // MongoDB
const users = await prisma.user.findMany();    // PostgreSQL
```

**NoSQL query (document):** To show a task with its comments:
```ts
// MongoDB — one query, comments are embedded
const task = await Task.findById(id);
// task.comments is already in the document!
```

### Exercise: Convert a MongoDB collection to SQL
If you moved Tasks to PostgreSQL, the `comments` array would need a separate table:
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id),
  user_id INTEGER REFERENCES users(id),
  text TEXT,
  created_at TIMESTAMP
);
```
And every read would need a JOIN. That's why MongoDB was chosen for tasks — comments are always read with the task.

### Exercise: Convert a SQL table to MongoDB
If you moved Users to MongoDB, you'd lose:
- The `@unique` constraint on email (must enforce in app code)
- Auto-incrementing IDs (would use ObjectId instead)
- Referential integrity (nothing prevents `assignedTo: 99999` pointing to a non-existent user)

### Key takeaways
- **SQL** for: structured data, ACID transactions, strict relationships, unique constraints
- **NoSQL** for: flexible schemas, embedded data, write-heavy workloads, fast reads without JOINs
- This project uses **polyglot persistence** — the right tool for each job
- SQL: Users (relational, need uniqueness & integrity)
- NoSQL: Tasks/Projects (documents with embedded arrays)
- Redis: Cache & counters (in-memory, ephemeral)

---

## Lab 5: Caching — Three Layers, One Request

**Goal:** See how data gets cached at every layer and understand cache invalidation.

### Step 1: The three caching layers

```
[Browser/Next.js] ─── RTK Query cache (client) ─── [Express API]
                                                            │
                                                     Redis cache (server)
                                                            │
                                                     MongoDB (source of truth)
```

### Step 2: Layer 1 — Server-side Redis cache
Open `backend/src/middleware/cache.ts`:
```ts
export const cache = (keyPrefix: string) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();  // Only cache reads

    const cacheKey = `${keyPrefix}:user:${userId}:${req.originalUrl}`;
    const cachedData = await redisHelpers.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache hit: ${cacheKey}`);  // ← See this in server logs
      return res.json(cachedData);
    }

    // Cache miss — intercept the response to store it
    res.json = function(data) {
      redisHelpers.set(cacheKey, data, 3600);  // Store for 1 hour
      return res.json.bind(this)(data);
    };
    next();
  };
};
```

**See it in action:**
1. Start the backend
2. Call `GET http://localhost:5000/api/tasks` (need auth)
3. Check server logs — you'll see: `❌ Cache miss: tasks:list:user:1:...`
4. Call it again — you'll see: `✅ Cache hit: tasks:list:user:1:...`
5. The second call returns instantly — no MongoDB query

### Step 3: Cache invalidation
Open `backend/src/services/taskService.ts` line 43:
```ts
// After creating a task, bust all cached task lists
await redisHelpers.deletePattern('tasks:list:*');
await redisHelpers.deletePattern('tasks:stats:*');
```

**Trace it:** When you create a task → `POST /api/tasks` → `taskService.createTask()` → saves to MongoDB → deletes all `tasks:list:*` cache keys → next `GET /api/tasks` is a cache MISS → fresh data from MongoDB.

### Step 4: Layer 2 — RTK Query client cache
Open `frontend/src/services/taskApi.ts`:
```ts
getTasks: builder.query({
  providesTags: (result) =>
    result?.tasks?.map(t => ({ type: 'Task', id: t._id })) || ['Task'],
}),

createTask: builder.mutation({
  invalidatesTags: ['Task'],  // ← Busts the entire task list cache
}),
```

**See it in action:**
1. Open browser DevTools → Network tab
2. Visit `/dashboard/tasks` — one API call to `GET /api/tasks`
3. Create a new task — API call to `POST /api/tasks`
4. RTK Query auto-refreshes the list — see the second `GET /api/tasks`
5. Navigate away and back — NO API call (cached result from step 2)

### Step 5: Layer 3 — Rate limiting (cache-like pattern)
Open `backend/src/middleware/rateLimit.ts`:
```ts
const count = await redisHelpers.increment(`rate_limit:${userId}:${req.path}`, 60);
if (count > 10) return res.status(429);  // Too fast!
```

Redis `INCR` + `EXPIRE` creates a sliding window counter. Each request increments, the key auto-deletes after 60 seconds.

### Exercise: Test cache invalidation
1. Call `GET /api/tasks` — cache MISS, returns data
2. Call it again — cache HIT
3. Create a task via `POST /api/tasks`
4. Call `GET /api/tasks` again — cache MISS (invalidation worked!)
5. Check Redis: `redisHelpers.keys('*')` to see all cache keys

### Exercise: Measure the difference
```ts
// Add timing to the cache middleware
console.time(cacheKey);
await next();
console.timeEnd(cacheKey);
```
Compare cache HIT (< 5ms) vs cache MISS (50-200ms with MongoDB query).

### Key takeaways
- **Redis cache** avoids database queries for repeated reads
- **RTK Query cache** avoids unnecessary network requests on the client
- **Cache invalidation** is the hardest problem — bust related keys on writes
- **Rate limiting** uses the same Redis infrastructure with `INCR` + `EXPIRE`
- All three layers have **graceful fallback** — if Redis is down, the app still works

---

## Lab 6: Horizontal & Vertical Scaling — What Breaks and What Doesn't

**Goal:** Understand what makes this app scalable and what limits it.

### Step 1: What enables horizontal scaling

**Stateless JWTs (the key enabler):**
Open `backend/src/middleware/authMiddleware.ts`:
```ts
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
(req as AuthRequest).user = { id: decoded.id, email: decoded.email, role: decoded.role };
```

No session stored on the server. Any instance can verify any token. You can add 10 servers behind a load balancer and they all work independently.

### Step 2: What would break with multiple servers

**Rate limiting:** If each server has its own in-memory counter, a user could send 10 req/min to each server = 40 req/min total.

**Fix:** This project uses **Redis** for rate limiting — all servers share the same counter:
```ts
const count = await redisHelpers.increment(`rate_limit:${userId}:${req.path}`, 60);
```

### Step 3: What limits horizontal scaling

**Prisma connection pooling** — open `backend/src/config/prisma.ts`:
```ts
const pool = new Pool({ connectionString: DATABASE_URL });
```
Each server needs its own pool. Too many servers = too many connections to PostgreSQL.

**MongoDB connection** — open `backend/src/config/db.mongodb.ts`:
```ts
await mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,  // ← Limits connections per server
});
```
Each server uses up to 10 connections. With 5 servers = 50 connections.

### Exercise: Simulate load
```bash
# Install siege or use curl in parallel
for ($i=0; $i -lt 20; $i++) { Start-Job { curl.exe http://localhost:5000/api/tasks } }
Get-Job | Wait-Job | Receive-Job
```
How many succeed? The rate limit kicks in after 10 requests per 60 seconds.

### Exercise: Design the ideal scaling strategy
For 100,000 users:
```
                          ┌──────────────┐
                          │  Load Balancer│
                          └──────┬───────┘
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Next.js 1│ │ Next.js 2│ │ Next.js 3│
              └──────────┘ └──────────┘ └──────────┘
                    │            │            │
                    └────────────┼────────────┘
                                 ▼
                          ┌──────────────┐
                          │    Redis     │  (shared cache + rate limits)
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │  MongoDB Atlas│ (auto-scaling replica set)
                          └──────────────┘
```

### Key takeaways
- **Stateless design** (JWT) is the #1 requirement for horizontal scaling
- **Shared Redis** solves the "distributed state" problem (rate limits, cache)
- **Connection pools** limit how many servers can connect to a database
- **Vertical scaling** (bigger server) is simpler but has a ceiling
- **Horizontal scaling** (more servers) is harder but unlimited
- This project is designed for horizontal scaling but not yet configured for it

---

## Lab 7: System Design Basics — Architecture Deep Dive

**Goal:** Draw and understand every layer of this project's architecture.

### The Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js UI)                     │
│  React 19 · RTK Query · Tailwind CSS · TypeScript           │
│  http://localhost:3000                                      │
├─────────────────────────────────────────────────────────────┤
│                    proxy.ts (Middleware)                     │
│  Auth guard · Redirects unauthenticated users to /login      │
├─────────────────────────────────────────────────────────────┤
│                    Express API (Backend)                     │
│  http://localhost:5000/api                                   │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐          │
│  │  Routes   │→ │  Middleware   │→ │  Controllers │          │
│  │          │  │  (auth, rate, │  │             │          │
│  │ index.ts │  │   cache, log) │  │ authCtrl.ts │          │
│  │ taskRoutes│  │              │  │ taskCtrl.ts │          │
│  │ projectR. │  │ authMiddleware│  │ projectCtrl │          │
│  └──────────┘  └──────────────┘  └──────┬──────┘          │
│                                         ▼                   │
│                                  ┌────────────┐            │
│                                  │  Services   │            │
│                                  │ (business   │            │
│                                  │  logic)     │            │
│                                  └──────┬─────┘            │
│                          ┌───────────────┼───────────┐     │
│                          ▼               ▼           ▼     │
│                    ┌──────────┐  ┌──────────┐ ┌────────┐ │
│                    │PostgreSQL│  │ MongoDB  │ │ Redis  │ │
│                    │ (Users)  │  │(Tasks,   │ │(Cache, │ │
│                    │ Prisma   │  │ Projects,│ │ Rate,  │ │
│                    │          │  │  Logs)   │ │Blacklist│ │
│                    └──────────┘  └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Trace "Create a Task"
1. User clicks "Create Task" in browser
2. `TaskForm.tsx` calls `useCreateTaskMutation()`
3. RTK Query sends `POST /api/tasks` with `credentials: 'include'` (cookie)
4. Express receives request → `taskRoutes.ts` matches route
5. `rateLimit(strict)` increments Redis counter — checks < 10/min
6. `authMiddleware` verifies JWT from cookie — attaches `req.user`
7. `asyncHandler` wraps for error handling
8. `taskController.createTask()` validates body, calls service
9. `taskService.createTask()` saves to MongoDB
10. Logs activity to MongoDB
11. Invalidates Redis cache keys (`tasks:list:*`)
12. Returns task with status `201`
13. RTK Query updates cache, React re-renders

### Step 2: Find each piece in the codebase

| Layer | File | What it does |
|-------|------|-------------|
| Frontend | `services/taskApi.ts` | API endpoint definition |
| Frontend | `components/tasks/TaskForm.tsx` | UI form component |
| Middleware | `proxy.ts` | Edge auth guard |
| Route | `backend/src/routes/taskRoutes.ts` | URL → controller mapping |
| Middleware | `backend/src/middleware/rateLimit.ts` | Throttling |
| Middleware | `backend/src/middleware/authMiddleware.ts` | JWT verification |
| Controller | `backend/src/controllers/taskController.ts` | HTTP handler |
| Service | `backend/src/services/taskService.ts` | Business logic |
| Model | `backend/src/models/mongodb/Task.ts` | Database schema |
| Cache | `backend/src/config/redis.ts` | Redis operations |

### Exercise: Draw the architecture from memory
1. Cover this page
2. Draw the complete request flow for "GET /api/tasks"
3. Include all middleware, controllers, services, and databases
4. Check your drawing against the real code

### Key takeaways
- **Three-tier architecture**: Presentation (Next.js), Application (Express), Data (3 databases)
- **Layered backend**: Routes → Middleware → Controllers → Services → Models
- Each layer has one responsibility — changing the database doesn't change the route
- The middleware chain is the "onion" pattern — requests pass through layers

---

## Lab 8: Capacity Estimation — Calculate What This App Needs

**Goal:** Estimate storage, bandwidth, and server requirements for different user counts.

### Step 1: Calculate storage per entity

**Task document** (from `Task.ts` schema):
| Field | Size | Notes |
|-------|------|-------|
| `_id` | 12B | ObjectId |
| `title` | 50B | Average 50 chars |
| `description` | 500B | Average (optional) |
| `status` | 10B | Enum string |
| `priority` | 10B | Enum string |
| `assignedTo` | 8B | Number |
| `createdBy` | 8B | Number |
| `dueDate` | 8B | Date |
| `createdAt`/`updatedAt` | 16B | Two dates |
| `tags` | 50B | Array of ~3 strings |
| `comments` (×5 avg) | 1000B | 5 comments × 200B each |
| BSON overhead | ~200B | MongoDB document overhead |
| **Total per task** | **~1.9KB** | |

### Step 2: Project for different scales

| Metric | 100 users | 1,000 users | 10,000 users | 100,000 users |
|--------|-----------|-------------|--------------|---------------|
| Tasks (100/user) | 10,000 | 100,000 | 1,000,000 | 10,000,000 |
| Storage (tasks) | 19 MB | 190 MB | 1.9 GB | 19 GB |
| Indexes (~1.5×) | 28 MB | 285 MB | 2.8 GB | 28 GB |
| Users (PostgreSQL) | 100 | 1,000 | 10,000 | 100,000 |
| User storage | ~50 KB | ~500 KB | ~5 MB | ~50 MB |
| Activity logs/user | 1,000 | 1,000 | 1,000 | 1,000 |
| Log storage (100B each) | 10 MB | 100 MB | 1 GB | 10 GB |
| Redis cache (active users) | 50 MB | 100 MB | 500 MB | 2 GB |
| **Total storage** | **~107 MB** | **~676 MB** | **~6.2 GB** | **~59 GB** |

### Step 3: Estimate request rates

**Rate limits** are already defined in `rateLimit.ts`:
```ts
strict:   { windowSeconds: 60, maxRequests: 10 },   // Writes
relaxed:  { windowSeconds: 60, maxRequests: 100 },  // Reads
```

**Daily volume for 1,000 active users:**
- Reads: 1,000 users × 50 reads/day = 50,000 GET requests
- Writes: 1,000 users × 10 writes/day = 10,000 POST/PUT/DELETE
- Total: ~60,000 requests/day ≈ **0.7 requests/second** (avg)
- Peak (5×): **3.5 req/s** — one server handles this easily

### Step 4: Network bandwidth
- Average response size: ~5 KB (task list with 10 items)
- Daily outbound: 50,000 × 5 KB = **250 MB/day**
- Peak: 3.5 req/s × 5 KB = **17.5 KB/s** — negligible

### Exercise: Calculate for your use case
```ts
// Create a capacity calculator at capacity-calc.ts
const estimate = {
  users: 10000,
  tasksPerUser: 100,
  taskSize: 1900,       // bytes
  readsPerDay: 50,
  writesPerDay: 10,

  get storage() { return this.users * this.tasksPerUser * this.taskSize; },
  get dailyReads() { return this.users * this.readsPerDay; },
  get dailyWrites() { return this.users * this.writesPerDay; },
  get peakRPS() { return (this.dailyReads + this.dailyWrites) / 86400 * 5; },
};
console.log('Storage needed:', (estimate.storage / 1024 / 1024).toFixed(1), 'MB');
console.log('Peak requests/sec:', estimate.peakRPS.toFixed(1));
```

### Key takeaways
- **Start small** — a single server handles 1,000 users easily
- **Index overhead** ~1.5× the data size — factor this in
- **Active users** matter more than registered users for cache sizing
- **Rate limits** give you a ceiling for capacity planning
- The app's rate limits (10 writes/min/user) cap peak writes at 10 req/s for 1,000 active users

---

## Lab 9: TCP/IP Stack — Trace a Packet

**Goal:** Understand every layer of the network stack when your browser talks to this app.

### The Stack
```
┌── Layer 7: Application ──────────────────────────────────────┐
│  HTTP/1.1, HTTPS/TLS                                          │
│  Your browser sends:                                          │
│    GET /api/tasks HTTP/1.1                                   │
│    Host: localhost:5000                                      │
│    Cookie: token=eyJhbGciOi...                               │
├── Layer 4: Transport ────────────────────────────────────────┤
│  TCP (port 5000)                                             │
│  Browser → SYN → Server                                      │
│  Browser ← SYN-ACK ← Server                                  │
│  Browser → ACK → Server  (3-way handshake done)              │
│  Data: your HTTP request, split into packets                 │
├── Layer 3: Network ──────────────────────────────────────────┤
│  IP (127.0.0.1 → 127.0.0.1)                                 │
│  Source: 127.0.0.1:54321                                     │
│  Dest:   127.0.0.1:5000                                      │
├── Layer 2: Data Link ────────────────────────────────────────┤
│  Loopback interface (no actual network hardware)             │
└──────────────────────────────────────────────────────────────┘
```

### Step 1: See the TCP handshake
Open Wireshark or use PowerShell to capture:
```bash
# Replace with the actual backend PID
netstat -ano | Select-String ":5000"
```
Every connection shows the TCP state (ESTABLISHED, TIME_WAIT, etc.).

### Step 2: See connection pooling
Open `backend/src/config/prisma.ts`:
```ts
const pool = new Pool({ connectionString: DATABASE_URL, max: 20 });
```
Prisma maintains a pool of TCP connections to PostgreSQL. Instead of opening/closing a TCP connection for every query (expensive), it reuses existing ones.

### Step 3: See TLS in action
The Redis connection uses `rediss://` — Redis over TLS:
```ts
// redis.ts
url: process.env.REDIS_URL,  // rediss://...
socket: { tls: true }
```

This means:
1. TCP handshake (3 steps)
2. TLS handshake (2 round trips — certificates, key exchange)
3. Then data flows over the encrypted TCP connection

### Step 4: See timeout settings
Open `backend/src/config/db.mongodb.ts`:
```ts
serverSelectionTimeoutMS: 5000,   // TCP connection timeout
socketTimeoutMS: 45000,           // Max idle time on TCP socket
```

### Exercise: Watch network traffic
1. Open browser DevTools → Network tab
2. Filter by "api" — see every request
3. Click on a request → Headers tab
4. You see: Request URL, Request Method, Status Code, Remote Address
5. The "Remote Address" is the IP + port (Layer 3 + Layer 4)
6. The headers are Layer 7 (Application)

### Exercise: Add connection logging
Add this to `backend/src/middleware/logger.ts`:
```ts
app.use((req, res, next) => {
  console.log(`[TCP] ${req.ip}:${req.socket.remotePort} → ${req.method} ${req.url}`);
  next();
});
```
This logs the TCP source address and port for every request.

### Key takeaways
- Every HTTP request starts with a **TCP 3-way handshake** (SYN, SYN-ACK, ACK)
- **TLS adds 2 round trips** on top of TCP for encrypted connections
- **Connection pooling** reuses TCP connections — critical for performance
- **Timeouts** prevent resource leaks from hung connections
- Localhost connections skip the network hardware but still go through the full TCP/IP stack

---

## Lab 10: Thrashing — When the System Runs Out of Resources

**Goal:** Understand resource exhaustion and the defenses this project has against it.

### What is thrashing?
In OS terms: when RAM is full, the OS swaps pages to disk. If the working set exceeds RAM, the system spends all its time swapping (disk I/O) instead of doing actual work. Throughput drops to near zero.

### In this project: MongoDB page faults
MongoDB keeps frequently accessed data (indexes + hot documents) in RAM. When the working set exceeds available RAM:

```
Working Set (RAM)     Disk (MongoDB data files)
┌────────────────┐    ┌────────────────────────┐
│ Index: assignedTo│   │ Old tasks (cold data)   │
│ Index: status    │   │ Archived projects       │
│ Recent 100 tasks │   │ Old activity logs       │
│ Active projects  │   │                        │
└────────────────┘    └────────────────────────┘
```

Without proper indexes, EVERY query reads from disk — the database equivalent of thrashing.

### Step 1: See the defenses against thrashing

**Defense 1: Rate limiting** (`rateLimit.ts`)
```ts
strict: { windowSeconds: 60, maxRequests: 10 }
```
Prevents one user from overwhelming the server with requests. This is the application-level equivalent of preventing CPU overload.

**Defense 2: Connection pooling** (`prisma.ts`)
```ts
const pool = new Pool({ connectionString: DATABASE_URL, max: 20 });
```
Limits the number of concurrent database connections. Too many connections = too many concurrent queries = memory pressure.

**Defense 3: Indexes** (`Task.ts`)
```ts
TaskSchema.index({ assignedTo: 1, status: 1 });
```
Ensures queries don't scan every document. An index lookup touches maybe 10 pages. A full collection scan touches millions of pages → disk thrashing.

**Defense 4: Graceful shutdown** (`server.ts`)
```ts
process.on('SIGINT', async () => {
  server.close();
  await mongoose.disconnect();
  await prisma.$disconnect();
  redisClient.quit();
});
```
Prevents resource leaks. A server that doesn't shut down properly leaks file descriptors, eventually hitting OS limits.

**Defense 5: TTL-based cache** (`redis.ts`)
```ts
await redisClient!.setEx(key, ttl, stringValue);
```
Redis keys auto-expire. Without TTLs, the cache would grow until it fills all RAM.

### Step 2: Simulate resource pressure
```ts
// Add this to a test file: backend/src/test-pressure.ts
import { performance } from 'perf_hooks';

// Simulate 100 concurrent users hitting the database
async function simulateLoad() {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      fetch('http://localhost:5000/api/tasks').catch(() => {})
    );
  }
  const start = performance.now();
  await Promise.all(promises);
  console.log(`100 requests took ${performance.now() - start}ms`);
}

// Without rate limiting: all 100 go through
// With rate limiting: only 10 go through, rest get 429
```

### Step 3: Monitor memory
```bash
# Watch Node.js memory usage
while ($true) {
  $proc = Get-Process -Id (netstat -ano | Select-String ":5000" | ForEach-Object {($_ -split '\s+')[-1]} | Select-Object -First 1)
  Write-Host "Memory: $($proc.WorkingSet64 / 1MB) MB"
  Start-Sleep -Seconds 5
}
```

### Key takeaways
- **Thrashing = system spends more time managing resources than doing work**
- **Rate limiting** prevents request overload (app-level anti-thrashing)
- **Indexes** prevent disk thrashing (database-level anti-thrashing)
- **Connection pooling** prevents database connection exhaustion
- **TTL-based caches** prevent memory from filling with stale data
- **Graceful shutdown** prevents resource leaks over time

---

## Lab 11: Google.com Request Flow — Full End-to-End

**Goal:** Trace every step of a request, using this project as a simpler model for understanding Google-scale infrastructure.

### The 12-Step Journey

Follow what happens when a user visits `/dashboard/tasks`:

```
Step 1: User enters URL
─────────────────────────
  ↓  Browser checks DNS cache
  ↓  No cache? DNS query to resolver
  ↓  Resolves localhost → 127.0.0.1
  
  Google scale: DNS → Global load balancer → Closest data center

Step 2: TCP + TLS Handshake
─────────────────────────
  Browser → SYN → Server
  Browser ← SYN-ACK ← Server
  Browser → ACK → Server
  → TCP established on port 3000
  → (In production: TLS handshake for HTTPS)
  
  Google scale: QUIC (HTTP/3) instead of TCP for faster handshake

Step 3: Next.js Receives Request
─────────────────────────
  Server parses URL, headers, method
  → Matches /dashboard/tasks to the file system route
  
  Google scale: HTTP/2 multiplexing, multiple requests over one connection

Step 4: proxy.ts Middleware (Auth Guard)
─────────────────────────
  Open frontend/src/proxy.ts:
  → Reads token from HTTP-only cookie
  → No token? Redirect to /login (302)
  → Has token? Continue to page render
  
  Google scale: Cloudflare/AWS WAF → Identity service → Routing

Step 5: Page Render (SSR or Client)
─────────────────────────
  Next.js renders the page
  → Sends HTML, CSS, JS bundles to browser
  → React hydrates on the client
  → TaskList component mounts
  
  Google scale: Edge rendering + streaming SSR + partial hydration

Step 6: RTK Query Fires
─────────────────────────
  Open frontend/src/services/taskApi.ts:
  → useGetTasksQuery() fires (auto-generated React hook)
  → Checks RTK Query cache (Redux store)
  → Cache HIT? Return cached data, skip API call
  → Cache MISS? Fire GET /api/tasks?page=1
  
  Google scale: Service worker → Local cache → API gateway → Microservice

Step 7: HTTP Request Sent
─────────────────────────
  fetchBaseQuery sends:
  
  GET /api/tasks?page=1 HTTP/1.1
  Host: localhost:5000
  Cookie: token=eyJhbGci...
  Origin: http://localhost:3000
  Content-Type: application/json
  
  Google scale: Protocol Buffers (binary) instead of JSON, HTTP/2

Step 8: CORS Check (Browser)
─────────────────────────
  Browser checks: Can localhost:3000 talk to localhost:5000?
  → Preflight? No (simple GET request)
  → Server must return Access-Control-Allow-Origin header
  
  Open backend/src/app.ts line 54-70:
  → If origin is in allowedOrigins, add CORS headers
  → Credentials: 'true' for cookie auth
  
  Google scale: Same-origin via reverse proxy, no CORS needed internally

Step 9: Express Middleware Chain
─────────────────────────
  Task route: POST /api/tasks

  Middleware 1: logger.ts → Logs request details
  Middleware 2: authMiddleware.ts → Verifies JWT from cookie
    → jwt.verify(token, secret) → decodes { id, email, role }
    → Checks Redis: isTokenBlacklisted(token)?
    → If blacklisted → 401 "Please login again"
    → Attaches req.user for downstream handlers
    
  Middleware 3: rateLimit.ts → Increments Redis counter
    → KEY: rate_limit:1:/api/tasks
    → VALUE: 3 (count in 60s window)
    → If > 10 → 429 "Too many requests"
    
  Middleware 4: cache.ts → Checks Redis
    → KEY: tasks:list:user:1:role:user:/api/tasks?page=1
    → HIT → Return cached JSON immediately
    → MISS → Override res.json to cache the response
  
  Google scale: Auth service → Quota service → Cache service → Orchestrator

Step 10: Business Logic (Controller + Service)
─────────────────────────
  taskController.getTasks(req, res)
  → Extracts query params (status, priority, page, limit)
  → Calls service: taskService.getTasks(userId, filters)
  
  taskService.getTasks(userId, filters)
  → Builds MongoDB query:
    { $or: [{ assignedTo: userId }, { createdBy: userId }] }
  → Applies filters if present (status, priority)
  → Applies sort: { createdAt: -1 } (newest first)
  → Applies pagination: .skip(0).limit(10)
  
  Google scale: Orchestrator → Dedicated task microservice → Sharded DB

Step 11: Database Query
─────────────────────────
  MongoDB receives query
  → Checks query planner → uses compound index { assignedTo: 1, status: 1 }
  → IXSCAN → finds matching documents in B-tree
  → Reads documents from RAM (working set) or disk (page fault)
  → Returns cursor with results
  
  Backend formats response:
  {
    tasks: [{ _id, title, status, priority, ... }],
    pagination: { page: 1, limit: 10, total: 42, pages: 5 }
  }
  
  Google scale: Bigtable/Spanner → Caching layer → Response serialization

Step 12: Response Flows Back
─────────────────────────
  1. MongoDB → taskService (formats response, adds pagination)
  2. taskService → taskController
  3. Cache middleware intercepts: stores response in Redis
     KEY: tasks:list:user:1:role:user:/api/tasks?page=1
     TTL: 3600s
  4. Express serializes JSON with status 200
  5. TCP packets carry response back to browser
  6. fetchBaseQuery receives JSON
  7. RTK Query parses response, updates Redux store
  8. React re-renders TaskList with new data
  9. User sees their tasks on screen!
  
  Total: ~50-500ms (local dev) or ~200-2000ms (production)
  
  Google scale: 12+ microservices, 5+ caches, global load balancing
  Total: ~100-500ms (optimized for sub-second response)
```

### Map This Project to Google-Scale

| This Project | Google's Equivalent |
|--------------|-------------------|
| Next.js on localhost:3000 | Global CDN + Edge servers (Cloudflare, Google Front End) |
| proxy.ts | Google Cloud Armor (WAF) + Identity-Aware Proxy |
| Express on localhost:5000 | Google API Gateway + Service Mesh (Istio) |
| authMiddleware.ts | Google Auth Service (OAuth 2.0, JWT verification) |
| rateLimit.ts (Redis) | Global Quota Service (rate limits per user per API) |
| cache.ts (Redis) | Distributed cache (Memcache, CDN, In-memory data store) |
| taskService.ts | Task Microservice (dedicated service, independent scaling) |
| MongoDB Atlas | Spanner / Bigtable (distributed, auto-scaling databases) |
| Redis (Upstash) | Memorystore (managed Redis for cache + rate limits) |
| RTK Query (client cache) | Service Worker + Client-side cache (Workbox) |
| errorHandler.ts | Centralized error reporting (Stackdriver/Sentry) |
| graceful shutdown | Kubernetes pod lifecycle (preStop hooks, draining) |

### Exercise: Add a new feature following the same pattern
To add "Task Categories":

1. **Database** — Add `category` field to `Task.ts` schema
2. **Backend route** — Add `/api/categories` to `taskRoutes.ts`
3. **Backend controller** — Add `taskController.getCategories()`
4. **Backend service** — Add `taskService.getCategories()`
5. **Frontend API** — Add `getCategories` to `taskApi.ts`
6. **Frontend component** — Create `CategoryList.tsx`
7. **Frontend page** — Add it to the router
8. **Middleware** — Auth, rate limit, and cache the new endpoint
9. **Test** — Create a task with a category, verify it persists

This is exactly how Google adds features — same pattern at every scale.

### Key takeaways
- The request flow is the **same pattern** whether it's this project or Google — just more layers
- Every additional layer (load balancer, CDN, service mesh) adds resilience but also latency
- **Caching at every layer** is how Google achieves sub-second responses
- **Redundancy and fault tolerance** are built in at every step
- The principles are identical: route → middleware → controller → service → data
