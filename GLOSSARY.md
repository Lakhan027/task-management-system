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

## Track C1/C2 — Docker (backend Dockerfile built from scratch)

| Term | Definition |
|---|---|
| **Image vs Container** | Image = the recipe/blueprint (on disk, doesn't run). Container = a running instance of that image (like a class vs an object). |
| **Multi-stage build** | Splitting a Dockerfile into a heavy "builder" stage (compiles code, has dev tools) and a lean "runner" stage (only what's needed to run) — keeps the final image small. |
| **Layer caching** | Each `COPY`/`RUN` line is cached; copying `package.json` before source code means `npm ci` doesn't rerun on every code change — only when dependencies actually change. |
| **`COPY --from=<stage>`** | Copies files from one build stage into another — the only way two stages can share anything. |
| **`npm ci` vs `npm ci --omit=dev`** | Builder stage needs dev dependencies (TypeScript compiler); runner stage only needs production ones — smaller final image. |
| **The `node_modules` overwrite trap** | Copying a lean `node_modules` in the runner stage, then later doing `COPY --from=builder .../node_modules`, silently overwrites the lean one with the full (dev-included) one — wasted work, caught live in this project. |
| **Re-running `prisma generate` in the runner stage** | Since the runner's own `node_modules` never had the generated Prisma client, it has to be regenerated there directly — `npx` fetches the `prisma` CLI temporarily for this without installing it permanently. |
| **`USER` placement** | All setup (`npm ci`, `COPY`, file creation) runs as root, because root never hits permission errors. `USER appuser` goes dead last, right before `CMD` — so only the running process drops privileges, not the setup steps. |
| **`HEALTHCHECK`** | A command Docker runs periodically to confirm the app is actually working, not just "started" — failures mark the container `unhealthy` without killing it. |
| **`docker inspect --format '{{json .State.Health}}'`** | Shows the actual health-check command's output/exit code — the fastest way to see *why* a container is unhealthy. |

## Bugs found live while containerizing the backend

| # | Bug | What happened |
|---|---|---|
| 8 | `.env` values wrapped in quotes | `dotenv` (local dev) strips quotes automatically; Docker's `--env-file` does not — `DATABASE_URL="postgresql://..."` was read literally starting with `"`, failing the `startsWith('postgresql://')` check and crashing the container. |
| 9 | Stray leading space before a key in `.env` | ` REDIS_URL=...` (leading space) risked being parsed as a key literally named `" REDIS_URL"`. |
| 10 | MongoDB Atlas IP whitelist | The container's outbound IP wasn't in Atlas's Network Access list — same root cause would affect local dev too if the ISP-assigned IP changes. Not a Docker-specific bug, but only surfaced when testing the container's own connectivity. |
| 11 | `wget: not found` inside `node:20-slim` | The `HEALTHCHECK` used `wget`, which isn't installed in the slim Debian image — every health check failed with exit code 1, marking the container permanently `unhealthy` even though the app worked fine. Fixed by using Node's own `http` module instead of installing an extra package. |
| 12 | Stale `TaskFilters` import in `taskApi.ts` (frontend) | The type in `types/task.ts` had been renamed to `TaskFiltersBody` (likely to avoid colliding with the `TaskFilters` React component), but `taskApi.ts` was never updated — broke `tsc --noEmit`, which would have also broken `next build` inside the frontend Docker image. Unrelated to Docker itself, just surfaced while typechecking before containerizing. |
| 13 | `npm ci` failing on optional platform-specific dependencies (frontend) | Tailwind v4's `@unrs/resolver-binding-wasm32-wasi` (a WASM fallback native binding) left `package-lock.json` with gaps in its `@emnapi/*` sub-dependency tree after a Windows `npm install`. Deleting just the lock file wasn't enough — `npm install` saw the existing `node_modules` and considered it "up to date." Only `rm -rf node_modules package-lock.json && npm install` forced a true from-scratch resolution. |
| 14 | Missing `tsconfig.json`/`next.config.ts` in the build context (frontend) | The builder stage only copied `src/`, so `next build` couldn't resolve any `@/...` path alias — 29 "Module not found" errors, one per aliased import, all from the same root cause. |
| 15 | `public/` never copied into the builder stage before the runner tried to steal it | `COPY --from=builder /app/public` failed with "not found" — you can't `COPY --from` a file that stage never had in the first place. |

## Track C3 — Docker (frontend, Next.js standalone)

| Term | Definition |
|---|---|
| **Build-time vs runtime env vars** | Backend reads `.env` at container *runtime* (`docker run --env-file`). Next.js bakes `NEXT_PUBLIC_*` vars into the JS bundle at *build time* — passing them at `docker run` is too late, the bundle is already frozen. |
| **`ARG` + `ENV` pairing** | `ARG` alone is only visible inside the Dockerfile itself; promoting it to `ENV` makes it visible to `process.env` during `RUN npm run build`. |
| **`docker build --build-arg`** | How a build-time `ARG` actually gets its value from outside the Dockerfile. |
| **`output: "standalone"`** | A Next.js build mode that traces exactly which `node_modules` packages are needed at runtime and produces a minimal, self-contained `.next/standalone/server.js` — built specifically for Docker. |
| **Standalone output's three missing pieces** | `.next/standalone` does not automatically include `public/` or `.next/static` — both must be copied into the runner stage separately, a well-known Next.js quirk. |
| **`CMD ["node", "server.js"]` vs `npm start`** | `npm start` runs `next start`, which needs the full non-standalone build. The standalone folder ships its own `server.js` — that's what actually gets run in a lean image. |
| **Image size payoff** | This project's frontend: 469MB single-stage vs 100MB with standalone + multi-stage — a concrete, measured number, not just theory. |

## Track C4 — Docker Compose

| Term | Definition |
|---|---|
| **`services:`** | Top-level key — each entry defines one container (`backend`, `frontend`), replacing a separate `docker run` per container. |
| **`build.context`** | Which folder to build from — equivalent to the path given to `docker build`. |
| **`env_file:`** | Same idea as `docker run --env-file`, just declared in YAML. |
| **`build.args:`** | Where build-time `ARG` values go in Compose — equivalent to `--build-arg` on the CLI. |
| **`depends_on:`** | Declares startup order between services (doesn't wait for "ready", just "started" unless combined with a healthcheck condition). |
| **Service name = hostname** | Compose creates a private network where containers can reach each other by service name (`http://backend:5000`) — but only *container-to-container*, not from the user's browser. |
| **The browser vs container-network trap** | `NEXT_PUBLIC_API_URL` runs in the *browser*, which is outside Compose's internal network — it must stay `http://localhost:5000/api`, never the service name, even though Compose would resolve the service name just fine from inside another container. |
| **`${VARIABLE}` substitution** | Compose auto-reads a `.env` file at the project root and substitutes `${VARIABLE}` anywhere in the YAML — keeps values like a URL in one editable place instead of hardcoded inline. |
| **Two separate `.env` files, two separate jobs** | `backend/.env` is injected into the backend container's runtime environment; the root `.env` is read by Compose itself to fill in `${...}` placeholders in the YAML — different files, different consumers. |
| **`docker compose up -d --build`** | One command replaces two separate `docker build` + `docker run` pairs — builds both images and starts both containers together, on a shared network. |

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
