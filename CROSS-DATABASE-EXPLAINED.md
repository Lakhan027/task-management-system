# How PostgreSQL + MongoDB Work Together in This Project

## The Big Picture

This project uses **three databases at once**, each for what it does best:

```
┌─────────────────────────────────────────────────────┐
│                  Express Server                      │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │            authService.ts                     │  │
│   │  ── writes new user to PostgreSQL             │  │
│   │  ── caches user profile in Redis              │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │            taskService.ts                     │  │
│   │  ── writes task to MongoDB                     │  │
│   │  ── writes activity log to MongoDB             │  │
│   │  ── invalidates task list in Redis             │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │            dashboardController.ts             │  │
│   │  ── reads users from PostgreSQL               │  │
│   │  ── reads tasks from MongoDB                  │  │
│   │  ── reads cache keys from Redis               │  │
│   │  ── combines all three into one response      │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 1. Each Database Connects Independently

At startup (`backend/src/config/database.ts:8`), all three databases connect in parallel:

```ts
await connectPostgreSQL();  // connects via Prisma + pg.Pool
await connectMongoDB();     // connects via Mongoose
await connectRedis();       // connects via ioredis
```

Each has its own config file and connection pool:

| Database | File | Connection String | Library |
|----------|------|------------------|---------|
| PostgreSQL | `backend/src/config/prisma.ts` | `DATABASE_URL` (Neon) | Prisma + `pg.Pool` |
| MongoDB | `backend/src/config/db.mongodb.ts` | `MONGODB_URI` (Atlas) | Mongoose |
| Redis | `backend/src/config/redis.ts` | `REDIS_URL` (Upstash) | ioredis |

**No shared connection** — they are completely independent. The server just talks to all three.

---

## 2. Users Live in PostgreSQL Only

When a user registers (`backend/src/services/authService.ts:51`):

```ts
// This writes to PostgreSQL via Prisma
const user = await prisma.user.create({
  data: { name, email, password: hashedPassword, role: "user" },
  select: { id, name, email, role, createdAt },
});
```

The Prisma schema defines the User table (`backend/prisma/schema.prisma:9`):

```prisma
model User {
  id        Int      @id @default(autoincrement())  // auto-incrementing integer
  name      String
  email     String   @unique                        // enforced at DB level
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```

**Key point:** `id` is an auto-incrementing integer (1, 2, 3...). This integer is what MongoDB uses to reference the user.

---

## 3. Tasks Live in MongoDB — They Reference the PostgreSQL User by ID

When a task is created (`backend/src/services/taskService.ts:25`):

```ts
const task = new Task({
  ...data,
  createdBy: userId,        // ← this is the PostgreSQL user.id (e.g. 42)
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

The Task schema (`backend/src/models/mongodb/Task.ts:33-34`) stores user references as **plain numbers**:

```ts
assignedTo: { type: Number, required: true },   // ← PostgreSQL user ID
createdBy:  { type: Number, required: true },   // ← PostgreSQL user ID
```

And in comments:
```ts
comments: [{
  userId:    { type: Number, required: true },  // ← PostgreSQL user ID
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}]
```

**Same pattern for projects** — `ownerId` and `members[].userId` are also plain numbers pointing to PostgreSQL users.

---

## 4. Visual: What the Data Looks Like Side by Side

**PostgreSQL — users table:**
```
 id |   name   |       email       | role  |         createdAt
----+----------+-------------------+-------+----------------------------
 1  | Alice    | alice@example.com | admin | 2026-01-15 10:30:00.000
 2  | Bob      | bob@example.com   | user  | 2026-02-20 14:00:00.000
 3  | Charlie  | charlie@test.com  | user  | 2026-03-10 09:15:00.000
```

**MongoDB — tasks collection (one document):**
```json
{
  "_id":        ObjectId("..."),
  "title":      "Fix login bug",
  "status":     "in-progress",
  "priority":   "high",
  "assignedTo": 2,          // ← points to Bob in PostgreSQL
  "createdBy":  1,          // ← points to Alice in PostgreSQL
  "projectId":  ObjectId("..."),
  "comments": [
    { "userId": 1, "text": "Started working on this", "createdAt": "..." },
    { "userId": 2, "text": "Found the issue",         "createdAt": "..." }
  ],
  "createdAt": "2026-03-15T..."
}
```

The `assignedTo: 2` is a **soft reference** — MongoDB doesn't enforce that user ID 2 exists in PostgreSQL. It's just a number. If you delete Bob from PostgreSQL, the task still has `assignedTo: 2` — it becomes an orphan reference.

---

## 5. The Problem: You Can't JOIN Across Databases

If both users and tasks were in PostgreSQL, you'd write:
```sql
SELECT tasks.*, users.name
FROM tasks
JOIN users ON tasks.assigned_to = users.id;
```

**You can't do this here** because tasks are in MongoDB and users are in PostgreSQL.

### How the code handles this — application-level JOIN

When the frontend needs to show a task with the creator's name, the backend does **two separate queries** and combines them in JavaScript.

This is done in `backend/src/controllers/dashboardController.ts:31-48`:

```ts
// Step 1: Query MongoDB for tasks
const tasks = await Task.find(taskFilter).sort({ createdAt: -1 }).limit(10).lean();

// Step 2: Query PostgreSQL for users
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true, role: true, createdAt: true },
  take: 10,
  orderBy: { createdAt: 'desc' },
});

// Step 3: Both results are returned together in one response
res.json({
  mongodb: { recentTasks: tasks, ... },
  postgresql: { recentUsers: users, ... },
});
```

### Another example: Task authorization check

In `taskService.ts:108`, the service checks if a user owns a task using the numeric ID:

```ts
if (task.assignedTo !== userId && task.createdBy !== userId) {
  throw new Error('Unauthorized to view this task');
}
```

`userId` comes from the JWT token (which was decoded from the PostgreSQL user record). `task.assignedTo` is stored in MongoDB. The comparison is just two integers.

---

## 6. The Full Flow: Register a User, Then Create a Task

### Step 1: User registers (all in PostgreSQL)

```
Registration Form
  → POST /api/auth/register  { name, email, password }
    → authService.register()
      → prisma.user.create()     ← writes to PostgreSQL
      → Returns: { id: 42, name, email, role, createdAt }
    → JWT created with { id: 42, email, role }
    → Cookie set with JWT
```

### Step 2: User creates a task (MongoDB + PostgreSQL)

```
Task Form
  → POST /api/tasks  { title, description, assignedTo: 42, ... }
    → authMiddleware decodes JWT → req.user = { id: 42, role: "user" }
    → taskService.createTask({ ... }, userId: 42)
      → new Task({ ..., createdBy: 42, assignedTo: 42 })   ← writes to MongoDB
      → new ActivityLog({ userId: 42, action: 'create' })   ← writes to MongoDB
      → redisHelpers.deletePattern('tasks:list:*')           ← deletes from Redis
    → Returns: { _id: ObjectId, title, ..., createdBy: 42 }
```

### Step 3: Frontend shows the task (no cross-database needed for display)

The task document contains `assignedTo: 42` and `createdBy: 42` as plain numbers. The frontend displays these numbers or, if user names are needed, makes a separate API call to get user details.

---

## 7. Key Trade-offs of This Architecture

| What You Gain | What You Lose |
|---------------|---------------|
| Embedded comments in tasks (no JOINs) | Cross-database JOINs are impossible |
| Flexible task schema (add fields anytime) | No foreign key enforcement (`assignedTo: 99999` doesn't error) |
| Tasks and projects can scale independently | Requires application-level joins (2 queries instead of 1) |
| Each DB optimized for its use case | More complex deployment (3 databases to manage) |
| MongoDB handles write-heavy loads well | No ACID transactions across databases |

---

## 8. Redis — The Bridge Between Them

Redis sits between the two databases and serves as:

1. **Cache for PostgreSQL data** — user profiles are cached in Redis after login (`authService.ts:114`):
   ```ts
   await redisHelpers.set(`user:${userId}:profile`, userData, 3600);
   ```

2. **Cache for MongoDB data** — task lists are cached in Redis after the first read (`cache.ts`):
   ```
   Key: tasks:list:user:42:role:user:/api/tasks?page=1
   ```

3. **Rate limiting** — all rate limit counters live in Redis, shared across all server instances

---

## 9. Code Map Summary

| What You Want to Do | Database | File |
|---------------------|----------|------|
| Create a user | PostgreSQL | `authService.ts:51` — `prisma.user.create()` |
| Login / verify password | PostgreSQL | `authService.ts:85` — `prisma.user.findUnique()` |
| Create a task | MongoDB | `taskService.ts:25` — `new Task({...}).save()` |
| Find tasks by user | MongoDB | `taskService.ts:57` — `Task.find({ $or: [{assignedTo}, {createdBy}] })` |
| Get user profile | PostgreSQL (cached in Redis) | `authService.ts:272` — `prisma.user.findUnique()` then `redisHelpers.set()` |
| Get dashboard data | ALL THREE | `dashboardController.ts:31-180` — queries MongoDB + PostgreSQL + Redis |
| Check auth | None (JWT decoded locally) | `authMiddleware.ts` — `jwt.verify()` |
| Rate limiting | Redis | `rateLimit.ts` — `redisHelpers.increment()` |
