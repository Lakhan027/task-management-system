# Career Roadmap — Backend Engineer + AWS

Personalized roadmap based on Lakhan Sharma's resume, built stage-by-stage. Each stage is appended below — earlier stages are not rewritten.

**Full plan (agreed):** Stage 1 (resume analysis + fundamentals gap) → Stage 2 (Backend + System Visualization Roadmap) → Stage 3 (AWS roadmap) → Stage 4 (priorities) → Stage 5 (hands-on projects) → Stage 6 (system design practice) → Stage 7 (job prep + interview questions) → Stage 8 (8–12 week plan) → Stage 9 (daily method + engineering mindset) → Stage 10 ("AWS ready" definition).

---

## Stage 1 — Resume Analysis + Fundamentals Gap

### Key observation

This is **not a fresher's resume**. 2.6+ years, shipping RBAC systems (5 roles / 24 permissions), a 7-state ticket lifecycle enforced across DB + ORM + UI, payment webhook reconciliation, and ERP integration — all in production. This changes the roadmap: the need isn't "learn HTTP," it's "name what I already do, and learn how it scales onto real infrastructure instead of Vercel."

### What's already known — from the resume

| Skill | Evidence |
|---|---|
| Middleware-based architecture | RBAC, account isolation, all enforced via Express middleware |
| RBAC (Role-Based Access Control) | 5 roles, 24 permissions (Arthtattva) |
| State machine design | 7-state ticket lifecycle, enforced at DB default + ORM + UI layers |
| Idempotency (practiced, not named) | Composite unique constraints + duplicate guards (Tally ERP), SHA-256 fingerprint dedup |
| Async event handling | PhonePe webhook-based async payment verification, 100% reconciliation |
| Real-time systems | Socket.io — typing indicators, read receipts, multi-thread messaging |
| Client-side caching (advanced) | RTK Query, 25+ cache tags, automatic invalidation |
| Relational DB design at scale | MySQL, 15+ tables, FK relationships, normalized schema, 800+ accounts |
| Query optimization | Prisma ORM indexing + query refactoring for 10K+ records |
| REST API design | 34+ endpoints, validation middleware, 99.5% success rate reported |
| Auth (multiple mechanisms) | JWT, OAuth 2.0 (listed), bcrypt, OTP verification |

### Strong / Intermediate / Basic / Missing

| Category | Skills |
|---|---|
| 🟢 **Strong** | Express.js middleware design, JWT auth, RBAC, MySQL relational design, REST API design, client-side caching (RTK Query), webhook-based async processing, Prisma ORM |
| 🟡 **Intermediate** | Real-time systems (Socket.io — real, but raw WebSocket internals / multi-server scaling never discussed), query optimization (good on a single DB instance, no replication/sharding experience), security (JWT+bcrypt+OTP solid, but no secrets-management or encryption-at-rest experience) |
| 🟠 **Basic** | Docker (listed in skills, never appears in a project bullet), CI/CD (listed, no bullet describes an actual pipeline), Python (listed, unused in any project) |
| 🔴 **Missing** | AWS (listed in skills, zero project bullets name any AWS service), queues/background jobs (all async work happens inline in the request cycle), load balancing/horizontal scaling (all deployment is on Vercel — a PaaS that hides this), DB replication/sharding, observability/monitoring tooling (no CloudWatch/Datadog/Sentry mentioned), formal distributed-systems vocabulary |

**Biggest flag:** Docker and AWS sit in the skills list but never appear in a single project bullet. That gap is exactly what an interviewer notices first — surface exposure, not production depth. This is why AWS deserves top priority in this roadmap.

### Backend knowledge → Cloud/AWS concept mapping

| What was already built | AWS equivalent |
|---|---|
| PhonePe webhook → async verify → DB update | SQS + Lambda pattern (decouple receipt from processing) |
| Prisma + MySQL connection | RDS (managed relational DB); connection pooling → RDS Proxy |
| Express middleware for RBAC/permissions | IAM policies — same least-privilege thinking, at the infrastructure layer |
| File attachments in Socket.io messaging | S3 (object storage, not local disk) |
| Deploying to Vercel | Everything Vercel automates (load balancer, auto-scaling, networking) has to be configured by hand on AWS |
| CI/CD (listed skill) | CodePipeline/CodeBuild, or GitHub Actions wired to AWS |
| Socket.io real-time messaging | API Gateway WebSockets, or ALB + sticky sessions with ECS |

**Key line:** Vercel hid the entire infrastructure layer — push, deploy, done. AWS requires understanding and configuring that layer directly. The gap isn't coding ability, it's infrastructure ownership.

### Current profile

**"Application-layer backend engineer with strong product-shipping instincts, zero infrastructure-ownership experience."**

Can take a requirement and ship a stable, production feature (99% uptime reported) — a real, non-trivial skill. But has never had to ask "what breaks when traffic goes from 10K to 1M users?" because Vercel never forced that question.

### Missing for a production-level backend engineer

1. **Infrastructure ownership** — configuring servers/networking/scaling directly, instead of a PaaS doing it invisibly
2. **Async processing via dedicated queues** — all async work today rides inside the request-response cycle; no experience with queue-based background processing
3. **Observability** — no monitoring tooling in the resume; "how would you know something broke?" is unanswered
4. **Thinking past single-DB-instance scale** — optimized 10K rows well, never had to reason about "one database is no longer enough"

### System design / visualization gaps

Feature-level architecture (state machines, RBAC layering, cache tagging) is genuinely strong. System-level architecture — the full box-and-arrow diagram from client to database across real infrastructure — has never been practiced, because managed services hid that picture.

---

### What to learn BEFORE AWS — personalized

| Topic | Status | Why |
|---|---|---|
| HTTP/HTTPS | ✅ Already know — SKIP | 34+ REST endpoints shipped professionally |
| REST APIs | ✅ Already know — SKIP | Expert-level experience already |
| Authentication (JWT/OTP/bcrypt) | ✅ Already know — SKIP | RBAC + JWT + OTP all in production |
| Authorization/RBAC | ✅ Already know — SKIP | Architected a 24-permission RBAC system |
| SQL / relational DB design | ✅ Already know — SKIP | 15+ table normalized schema with FK relationships |
| Indexes | 🟡 Need basic revision | Optimized queries, but never formally read a query plan (EXPLAIN) |
| Transactions (ACID) | 🟡 Need basic revision | "ACID compliance" is on the resume, but the *how* (e.g. Prisma `$transaction`) is still a buzzword-level understanding |
| Connection pooling | 🟠 Need deeper understanding | Prisma pools silently — never reasoned about "500 concurrent requests, what happens" |
| DNS | 🔴 Must revise before AWS | Route 53 is built directly on this — zero exposure |
| TCP/IP basics | 🔴 Must revise before AWS | Foundation for understanding load balancers/VPCs |
| Docker | 🔴 Must revise before AWS | The single biggest resume-vs-reality gap |
| Linux basics | 🔴 Must revise before AWS | Needed everywhere from EC2 to debugging; absent from the resume |
| Queues / background jobs | 🔴 Must revise before AWS | Need the concept before SQS makes sense |
| Networking basics (load balancer, VPC concept) | 🔴 Must revise before AWS | Vercel hid this; needs to be learned from scratch |
| Environment variables / secrets | 🟡 Need basic revision | `.env` used daily, but never asked "why would I need a secrets manager if `.env` works?" |
| Logging / error handling | ✅ Already know — SKIP | Already strong via middleware design; deepened further in the task-management-system project (Track A2) |
| WebSockets | 🟡 Need basic revision | Socket.io experience is real, but raw WebSocket protocol and "why Socket.io gets hard across multiple servers" is a gap |

### Immediate priority order (before AWS)

1. **Docker** — biggest resume-vs-reality gap; also the foundation for ECS/Lambda containers
2. **Linux basics** — command line, file permissions, processes — the base layer of EC2
3. **DNS + TCP/IP + networking basics** — prerequisite for Route 53, VPC, Load Balancer
4. **Queues/background jobs (concept)** — understand the problem before learning SQS
5. **Connection pooling + transactions** — small gap, immediately relevant once RDS is in the picture

---

## Stage 2 — *(not started yet)*

## Stage 3 — *(not started yet)*
