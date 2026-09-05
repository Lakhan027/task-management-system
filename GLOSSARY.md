# Glossary — Backend Ka Naksha

One-line definitions, added as each lesson is finished. See [roadmap artifact] for the full track list.

Update rule: after every lesson, append new terms here — don't rewrite old ones.

---

## Track A1 — Request Lifecycle

| Term | Definition |
|---|---|
| **Middleware** | A function that runs before your final response is sent. |
| **`next()`** | "I'm done, pass the request to the next function." |
| **Route** | A URL + method (`GET /tasks`) mapped to a specific handler function. |
| **Controller** | The function that reads the request and decides what to do. |
| **Service** | The function that actually talks to the database. |
| **Guard** | A middleware that can stop a request before it reaches the controller. |

## Track A2 — Middleware Deep Dive

| Term | Definition |
|---|---|
| **Middleware function** | Any function shaped `(req, res, next)` — that's all Express needs. |
| **Factory middleware** | A function that takes config and *returns* a middleware, e.g. `rateLimit(config)`. |
| **Middleware order** | Runs top-to-bottom, exactly in the order you wrote it. |
| **Error middleware** | A middleware with 4 params `(err, req, res, next)` — only runs when an error happens. |
| **`next(err)`** | "Skip everything normal, go straight to error handling." |
| **Hanging request** | When no middleware calls `next()` or sends a response — the browser waits forever. |

## Track A3 — Event Loop

| Term | Definition |
|---|---|
| **Single-threaded** | Node runs your JavaScript one instruction at a time, on one thread. |
| **`await`** | "Send this task away, and come back to me when it's done — don't wait here." |
| **Non-blocking (I/O)** | A slow task (DB call, network) that lets other requests run while it waits. |
| **Blocking (CPU)** | A slow task that hogs the thread — nothing else can run until it finishes. |
| **Event loop** | The thing that keeps asking "is the thread free? give it the next waiting task." |
| **Concurrency** | Many requests appear to run "at once" because each one waits without blocking the others. |

## Track A4 — Auth Flow

| Term | Definition |
|---|---|
| **JWT** | A signed "passport" — server writes `{id, role}` on it and signs it, but never stores it anywhere. |
| **Payload (JWT)** | The user info inside the token — readable by anyone (it's just base64), not secret. |
| **Signature (JWT)** | The proof that the server issued this token and nobody tampered with it. |
| **`httpOnly` cookie** | A cookie JavaScript in the browser cannot read — protects the token from XSS theft. |
| **Token blacklist** | A Redis list of "dead" tokens — since a JWT can't be deleted, logout just marks it as invalid. |
| **TTL matching expiry** | A blacklist entry only needs to live as long as the token would anyway — no point keeping it longer. |
| **Dead code** | Code that runs but does nothing real — like `session:*` keys that get deleted but are never created. |

## Track B4 — Bug Fixing

| Term | Definition |
|---|---|
| **`try/catch` vs `asyncHandler`** | Two ways to catch an async error and forward it to `next()` — same result, catch it from inside or from outside. Using both is redundant, not wrong. |
| **Redundant middleware** | Middleware that runs but never changes anything — e.g. `asyncHandler` wrapping a function that already has its own `try/catch`. |
| **Status code range check** | Testing `res.statusCode < 300` instead of `=== 200`, so the logic still works if a route later returns 201 or 204. |

## Bugs — status

| # | Bug | Status |
|---|---|---|
| 1 | Response envelope mismatch (frontend/backend) | ✅ fixed (`projectApi.ts`, `taskApi.ts`) |
| 2 | Cache middleware saved error responses | ✅ fixed |
| 3 | Cache invalidation key mismatch (`tasks:detail:*`) | ⏸ parked — will revisit with Redis/caching lesson |
| 4 | Login/register had no validation or rate limit | ✅ fixed |
| 5 | Assignee picker uses mock users, no `/api/users` endpoint | ⏸ parked — design agreed (authenticate-only, not admin-only, since `TaskForm` needs it for every user), implementation pending |
| 6 | Task search box sent but ignored by backend | ✅ fixed (regex-escaped search on `title`) |
| 7 | `logoutAll` doesn't blacklist anything | ⏸ parked — will revisit with Redis/caching lesson |
| — | `getTaskStats` also missing envelope unwrap, but hook is never called from any component (dead code) | ⬜ optional, low priority |

## Track B4 — Bug Fixing (continued)

| Term | Definition |
|---|---|
| **Dead code path** | Code that has a bug but never runs, because nothing in the UI calls it — the bug exists but has no visible effect yet. |
| **Regex injection** | Passing raw user input straight into a `$regex` query — a crafted string can match everything or slow the server down (ReDoS). |
| **Escaping regex special characters** | Turning `.`, `*`, `+`, etc. into literal characters (`\.`, `\*`) before using untrusted input in a regex, so it's matched as plain text. |

## Track A5 — Three Databases, One Request

| Term | Definition |
|---|---|
| **Application-level join** | Since Postgres and MongoDB can't `JOIN` across engines, the code fetches from each separately and stitches results together in JavaScript. |
| **Referential integrity** | A database's guarantee that a foreign key always points to something real — MongoDB can't enforce this against Postgres, so orphaned references are possible. |
| **Orphaned reference** | A field like `Task.assignedTo` that points to a `User.id` which no longer exists — nothing errors, the link is just silently broken. |
| **Index** | A shortcut structure that lets the database jump straight to matching documents instead of scanning every one. |
| **Compound index** | An index built on more than one field together (e.g. `{assignedTo, status}`), matching how the query actually filters. |
| **COLLSCAN vs IXSCAN** | MongoDB's `.explain()` report: COLLSCAN means every document was checked; IXSCAN means the index was used to jump straight to matches. |
| **`docsExamined` vs `nReturned`** | If these numbers are far apart, the query is scanning much more than it needs — a sign a useful index is missing. |

## Bugs / lessons found live in this project's own code

| Term | Definition |
|---|---|
| **Cascading failure** | One small bug (missing auth) breaks something else further down the chain (a bad Redis key). |
| **Swallowed error** | A `catch` block that hides an error instead of reporting it — the log lies. |
| **Fail-open vs fail-closed** | When a dependency (like Redis) dies, do you let requests through anyway, or block them? |
| **CORS preflight** | The browser secretly sends an `OPTIONS` request first to ask "am I allowed to POST here?" |
| **Cache rule** | GET reads from cache, POST/PUT/DELETE must clear it — or users see stale data. |

## Track A6 — Redis Practical (Hash, Session Registry)  ⏸ paused here, resume later

| Term | Definition |
|---|---|
| **In-memory store** | Redis keeps everything in RAM, not on disk — much faster, but not the source of truth (Postgres/Mongo still are). |
| **String type** | One key → one value (what `redisHelpers` already used everywhere: cache, blacklist, rate limit). |
| **Hash type** | One key → many field-value pairs — like a mini object inside one locker. Built `sessionService.ts` with this. |
| **`HSET` / `HGETALL` / `HDEL`** | Add-or-update one field / read all fields / remove one field, without touching the rest of the hash. |
| **`EXPIRE key seconds`** | Attaches a TTL to *any* existing key — needed separately, because `HSET` doesn't set one on its own. |
| **`KEYS` vs `SCAN`** | `KEYS` blocks the whole Redis server while it scans everything; `SCAN` does it in safe small steps. Never use `KEYS` in real code. |
| **Session registry pattern** | One Hash per user (`session:<userId>`), one field per logged-in device (field = token, value = expiry). Enables a real "logout from all devices." |
| **`for` loop vs `Promise.all`** | Independent async operations (like blacklisting N tokens) should run concurrently with `Promise.all`, not one-by-one in a `for` loop. |
| **try/catch placement inside `Promise.all`** | Must catch errors *inside* each mapped function — otherwise one failure rejects the whole batch and cancels everyone else's success. |
| **Fail-open consistency** | Chose to make `logoutAll()` swallow Redis errors and still report success, matching `logout()` and the rest of the app's established pattern. |

### Where we paused (2026-09-06)

- ✅ `sessionService.ts` written from scratch, unit-tested live against real Upstash Redis (`session-service-test.mjs`).
- ✅ Wired into `authService.ts` — `login` → `addSession`, `logout` → `removeSession`, `logoutAll` → `getAllSessionTokens` + blacklist all (`Promise.all`) — **Bug 7 code-complete**, typecheck clean. Live end-to-end curl verification (multi-device logout-all → old token gets `401`) was set up but not yet confirmed run.
- ⏸ **Bug 3** (`tasks:detail:*` cache invalidation) still open — now easy given Hash/EXPIRE knowledge, was next in line when paused.
- ⏸ New Redis feature ideas discussed but not started: recently-viewed tasks (List), online users (Set), leaderboard (Sorted Set), duplicate-submit lock (`SET NX`), real-time notifications (Pub/Sub).
- 🗑️ Scratch files to clean up eventually (not production code): `event-loop-demo.mjs`, `db-explain-demo.mjs`, `concurrency-test.mjs`, `redis-hash-demo.mjs`, `session-service-test.mjs`.

## Bugs — status (updated)

| # | Bug | Status |
|---|---|---|
| 3 | Cache invalidation key mismatch (`tasks:detail:*`) | ⏸ still parked — pick up when Redis work resumes |
| 7 | `logoutAll` doesn't blacklist anything | ✅ code complete via session registry — live curl verification pending |

| **`logoutAll` doesn't blacklist anything (bug #7)** | Fixed via a from-scratch Redis Hash session registry (`sessionService.ts`) — see Track A6. |
