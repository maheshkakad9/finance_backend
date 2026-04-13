# Finance Data Processing and Access Control Backend
// Mahesh Kakad
// maheshkakad06@gmail.com
  Node.js + TypeScript + PostgreSQL + Redis

---

## Tech Stack

| Technology           |             Purpose |                 Why Chosen |
|---|---|---|
| Node.js + TypeScript | Runtime + Language | Type safety catches bugs at   compile time. Strict mode enforced throughout. |
| Express.js           |      HTTP Framework | Mature ecosystem, clean      middleware composition. |
| PostgreSQL           | Primary Database    | ACID compliance critical for financial data. `Decimal` type prevents floating-point money errors. |
| Prisma ORM           | Database Access     | Type-safe queries, auto-generated TypeScript types from schema, clean migration history. |
| Redis                |  Cache + Token Store | Token blacklisting on logout (JTI store), rate limit counters, 60s dashboard cache. |
| Zod                 | Validation            | Schema-first validation with TypeScript inference. Validates body, query params, and path params. |
| JWT                 | Access Tokens         | Stateless auth. 15-min TTL with unique JTI per token for selective blacklisting on logout. |
| bcryptjs            | Password Hashing      | Industry standard. Cost factor = 12 in production. Auto-salted — no two hashes are the same. |
| swagger-jsdoc       | API Documentation     | Generates OpenAPI 3.0 spec from JSDoc comments in route files. Live at `/docs`. |
| Postman             | API Testing           | All 18 routes tested manually with a shared collection. Tests scripts auto-save tokens to environment variables. |

---

## Database Schema

| Table             |            Key Columns |               Notes |
|---                |---                     |---                   

| `users`           | id (uuid), email, password, name, role, isActive, deletedAt | Soft delete via `deletedAt`. Role enum: VIEWER / ANALYST / ADMIN |

| `financial_records` | id, userId, amount (Decimal 12,2), type, category, date, description, deletedAt | `Decimal` not `Float` — exact money arithmetic |

| `refresh_tokens` | id, token (SHA-256 hash), userId, expiresAt, revoked | Raw token sent to client, only hash stored in DB |

---

## Project Overview

A production-ready REST API for financial data management with role-based access control. Built for the Zorvyn Backend Developer Intern assignment.

The system supports three user roles with progressively increasing permissions:

- **VIEWER** — read-only access to their own records and dashboard summary
- **ANALYST** — can create and update their own records, access trend analytics
- **ADMIN** — full access to all users' records, user management, delete and restore

---

## Architecture

Request flows through a strict layered architecture:

```
HTTP Request
    → Middleware (authenticate → requireRole → validate)
    → Controller  (parse request, call service, format response)
    → Service     (all business logic lives here)
    → Repository  (all Prisma/DB queries live here)
    → PostgreSQL / Redis
```

### Folder Structure

```
src/
├── config/          # db.ts · redis.ts · env.ts · swagger.ts
├── controllers/     # auth · user · record · dashboard
├── services/        # auth · user · record · dashboard
├── repositories/    # user · record · token
├── routes/          # Express routers with full Swagger JSDoc
├── middlewares/     # authenticate · requireRole · validate · rateLimiter · errorHandler
├── schemas/         # Zod validation schemas
├── utils/           # response · errors · token · hash · pagination
├── types/           # AuthenticatedRequest type (extends Express Request)
├── app.ts           # Express app factory
└── server.ts        # HTTP server entry point + graceful shutdown
```

**Controllers** never contain business logic — they parse the request and call a service.  
**Services** never import from Express — pure TypeScript, no HTTP concerns.  
**Repositories** are the only layer that talks to Prisma.

---

## Core Requirements

### 1. User & Role Management

All new registrations default to VIEWER. An Admin promotes users via `PATCH /api/users/:id/role`.

| Action                  | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| View own records        | ✓      | ✓      | ✓     |
| View all records        | ✗      | ✗      | ✓     |
| Create records          | ✗      | ✓      | ✓     |
| Update own records      | ✗      | ✓      | ✓     |
| Update any record       | ✗      | ✗      | ✓     |
| Delete records (soft)   | ✗      | ✗      | ✓     |
| Restore deleted records | ✗      | ✗      | ✓     |
| Manage users            | ✗      | ✗      | ✓     |
| View trend dashboard    | ✗      | ✓      | ✓     |

### 2. Financial Records Management

Each record stores: `amount` (Decimal — never Float), 
`type` (INCOME / EXPENSE), 
`category`, 
`date`, 
optional `description`.

**GET /api/records supports:**
- Filter by `type`, `category` (case-insensitive partial match), `startDate`, `endDate`
- Full-text `search` across description and category
- `sortBy` (date / amount / createdAt) + `order` (asc / desc)
- Pagination via `page` + `limit` — returns `meta.totalPages`
- Soft delete (sets `deletedAt`) — rows never removed from DB
- Admin can restore via `PATCH /api/records/:id/restore`

### 3. Dashboard Summary APIs

All aggregations use `Prisma groupBy` and PostgreSQL `DATE_TRUNC` — records are never fetched and summed in JavaScript. Results cached in Redis for 60 seconds.

| Endpoint                  | Description                            | Role |
|---|---|---|
| GET /api/dashboard/summary | Total income, expenses, net balance, counts | All (scoped) |
| GET /api/dashboard/by-category | Grouped totals by category + type | All (scoped) |
| GET /api/dashboard/trend  | Weekly trend — last 24 weeks via DATE_TRUNC | ANALYST, ADMIN |
| GET /api/dashboard/recent  | Latest N records ordered by date desc | All (scoped) |

"Scoped" means VIEWER and ANALYST only see their own data. ADMIN sees all users combined.

### 4. Access Control Logic

Every protected route runs two middleware in sequence:

1. `authenticate` — verifies JWT signature, checks expiry, checks Redis blacklist for the token's `jti`
2. `requireRole(...roles)` — checks `req.user.role` against the allowed roles for that route

Ownership enforcement (e.g. "Analyst can only update their own record") happens inside the **service layer** — after the record is fetched from the DB and `userId` is compared.

### 5. Validation & Error Handling

All request bodies and query strings validated with Zod schemas before reaching controllers.

**Validation error response (422):**
```json
{
  "success": false,
  "message": "Validation failed",
  "fields": {
    "amount": "Amount must be a positive number",
    "type": "Invalid enum value. Expected 'INCOME' | 'EXPENSE'"
  }
}
```

**All responses follow a consistent shape:**
```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "code": "NOT_FOUND" }
```

A global error handler converts Prisma known errors (P2002 → 409, P2025 → 404), custom `AppError` subclasses, and unexpected crashes (500 — logged server-side only, never exposed to client).

---

## Authentication & Token Strategy

### Access Token (JWT)
- 15-minute TTL — short window limits damage from token theft
- Payload: `id`, `email`, `name`, `role`, `jti` (unique JWT ID per token)
- On logout: `jti` stored in Redis with TTL = token's remaining lifetime → immediately invalid

### Refresh Token (Opaque)
- 64 bytes of `crypto.randomBytes` → 128 hex chars — brute-force infeasible
- **Never stored raw** — SHA-256 hashed before writing to `refresh_tokens` table
- **Rotation:** every use revokes the old token and issues a completely new pair
- 7-day expiry stored in the database row

### Why not sessions?
Sessions require a shared session store for horizontal scaling. JWT + refresh tokens scale horizontally without shared state. Storing the refresh token hash in PostgreSQL gives us revocation capability that pure stateless JWTs lack.

---

## Design Tradeoffs

**Primary tradeoff: Consistency over Availability** — appropriate for financial data where incorrect totals are more harmful than a brief outage.

| Decision           | Chosen                   | Tradeoff |
|---|---|---|
| Money storage      | `Decimal(12,2)` in PostgreSQL | Slightly more storage than Float; eliminates all floating-point precision errors |

| Token revocation   | Redis JTI blacklist | Extra Redis lookup per request; tokens are immediately invalid after logout (not eventually) |

| Refresh token storage | SHA-256 hash in PostgreSQL | DB hit on every refresh; enables immediate revocation and rotation |

| Dashboard cache | 60-second Redis TTL | Totals may be up to 60s stale; eliminates repeated aggregation queries under load |

| Soft delete | `deletedAt` timestamp, never `DELETE` | Table grows over time; enables audit trail and admin restore |

| Role in JWT | Embedded at login time | Role change requires re-login; eliminates a DB lookup on every request |

| UUID primary keys | Instead of auto-increment | Safe to expose in URLs — integers leak record counts |

| Account enumeration | Same error for wrong email and wrong password | Slightly less specific error message; prevents attackers probing which emails are registered |

---

## API Routes

### Auth — `/api/auth`

| Method | Route | Auth Required | Description |
|---|---|---|---|
| POST | /register | No | Register — default VIEWER role, returns tokens |
| POST | /login | No | Login with email + password |
| POST | /refresh | No | Rotate refresh token → new token pair |
| POST | /logout | Yes | Blacklist access token + revoke refresh token |
| GET | /me | Yes | Current user profile (no password field) |

### Users — `/api/users` (Admin only)

| Method | Route | Description |
|---|---|---|
| GET | / | List all users (paginated) |
| GET | /:id | Single user by UUID |
| PATCH | /:id/role | Change role to VIEWER / ANALYST / ADMIN |
| DELETE | /:id | Soft delete user (sets deletedAt) |

### Records — `/api/records`

| Method | Route | Role | Description |
|---|---|---|---|
| POST | / | ANALYST, ADMIN | Create financial record |
| GET | / | All (scoped) | List with filters, search, sort, pagination |
| GET | /:id | All (scoped) | Single record — ownership enforced |
| PATCH | /:id | ANALYST (own), ADMIN | Partial update |
| DELETE | /:id | ADMIN | Soft delete |
| PATCH | /:id/restore | ADMIN | Restore soft-deleted record |

### Dashboard — `/api/dashboard`

| Method | Route | Role | Description |
|---|---|---|---|
| GET | /summary | All (scoped) | Income, expenses, net balance |
| GET | /by-category | All (scoped) | Grouped by category + type |
| GET | /trend | ANALYST, ADMIN | Weekly trend (DATE_TRUNC, last 24 weeks) |
| GET | /recent | All (scoped) | Latest N records by date |

---

## Setup & Running Locally

### Prerequisites
- Node.js 18+
- Docker Desktop

### Steps

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env — set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET (min 32 chars each)
```

**3. Start PostgreSQL and Redis**
```bash
docker-compose up -d postgres redis
```

**4. Run database migrations**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Start development server**
```bash
npm run dev
```

- API: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/docs`

### First-time Admin Setup

All registrations default to VIEWER. Promote yourself to Admin:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```
Then log in again — the new role is embedded in the fresh JWT.

---

## Postman Testing

A Postman collection and environment file are included in the repository.

### How to import

1. Open Postman → **File → Import**
2. Import both files:
   - `Finance-Backend.postman_collection.json`
   - `Finance-Backend.postman_environment.json`
3. Select **Finance Backend** from the environment dropdown (top right)
4. Run **POST /auth/register** or **POST /auth/login** — the Tests script auto-saves your access token and refresh token to the environment

> Tokens are saved automatically. You never need to copy-paste tokens between requests.

### Environment Variables

| Variable       | Description                | How it gets set |
|---|---|---|
| `base_url`     | `http://localhost:3000/api` | Set manually once |
| `access_token` | Current JWT                 | Auto-saved by login/register Tests script |
| `refresh_token`| Current refresh token       | Auto-saved by login/register Tests script |
| `record_id`    | Last created record UUID    | Auto-saved by create record Tests script |
| `user_id`      | Target user UUID            | Auto-saved by get users Tests script |

### Testing Flow

1. `POST /auth/register` → tokens auto-saved
2. In DB: `UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';`
3. `POST /auth/login` → fresh tokens with ADMIN role
4. `POST /auth/register` for a second account (analyst@test.com)
5. `PATCH /users/:id/role` → set analyst to ANALYST role
6. `POST /records` with analyst token → creates records, `record_id` auto-saved
7. `GET /records` with all filter combinations
8. `GET /dashboard/summary` → verify netBalance = totalIncome - totalExpenses
9. `DELETE /records/:id` (admin) → `GET` same ID → confirm 404
10. `PATCH /records/:id/restore` → confirm record is back
11. `POST /logout` → `GET /me` with same token → confirm 401

---

## Environment Variables

| Variable               | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL`         | Yes      | —       | PostgreSQL connection string |
| `REDIS_URL`            | No       | `redis://localhost:6379` | Redis connection URL |
| `PORT`                 | No       | `3000`  | Server port |
| `ACCESS_TOKEN_SECRET`  | Yes      | —      | Min 32 chars — signs JWT access tokens |
| `REFRESH_TOKEN_SECRET` | Yes      | —      | Min 32 chars — reserved for future use |
| `ACCESS_TOKEN_EXPIRY`  | No       | `15m`  | JWT lifetime |
| `REFRESH_TOKEN_EXPIRY_DAYS` | No  | `7`    | Refresh token lifetime in days |
| `BCRYPT_SALT_ROUNDS`   | No       | `12`  | bcrypt cost factor — do not lower in production |
| `RATE_LIMIT_WINDOW_MS` | No       | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX`       | No       | `100`   | Max requests per window per IP |

---

## Optional Enhancements Implemented

| Enhancement                | Implementation |
|---|---|
| Authentication via tokens  | JWT access token + opaque refresh token with rotation and Redis JTI blacklisting |
| Pagination                 | All list endpoints — `page`, `limit`, `totalPages` in `meta` block |
| Search                     | Full-text search on `description` + `category` via Prisma `contains` |
| Soft delete                | `deletedAt` on users and records, restore endpoint for records |
| Rate limiting              | Redis-backed — 100 req/15min global, 10 req/15min on auth routes |
| API documentation          | Swagger UI at `/docs` — all 18 routes documented with request/response examples |
| Graceful shutdown          | `SIGTERM`/`SIGINT` handlers drain in-flight requests before disconnecting DB and Redis |

---

## Production Deployment

```bash
docker-compose up -d
```

Starts the full stack — Node.js app container, PostgreSQL, and Redis — on a shared Docker network. Set production secrets as environment variables in your hosting platform. Never commit `.env` to source control.
