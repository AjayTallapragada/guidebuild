# AI-Powered Parametric Insurance for Delivery Workers

Production-style full-stack monorepo for a parametric insurance platform with role-based operations for workers and admins.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MySQL (mysql2)
- Auth: JWT access + refresh tokens

## High-Level Modules

### Worker Module
- Browse prepaid policy catalog and buy policies
- View own active policies
- Cancel own policies
- Simulate trigger events to generate claims
- Run automated disruption sweeps for a delivery zone
- Optionally attach proof image URL while creating trigger claim
- Track claim status (`pending`, `approved`, `rejected`, `paid`)
- View AI fraud score, fraud flags, and auto-approval recommendation
- View payouts and complete payout using payment mode:
  - `upi`
  - `bank_account`
  - `online_wallet`
- Choose a simulated gateway:
  - `upi_simulator`
  - `razorpay_test`
  - `stripe_sandbox`

### Admin Module
- View all claims across workers
- Approve or reject pending claims
- Clear claims (admin-only)
- View all payouts across workers
- View payout owner (worker ID) and payment status
- View loss ratio, fraud pressure, trigger mix, and next-week prediction dashboard

## Business Flow
1. Worker buys policy from catalog.
2. Worker triggers event from Claims page.
3. System creates claim with `under_review` (pending).
4. Admin reviews and approves/rejects.
5. If approved, payout is queued.
6. Worker opens Payouts page, chooses payment mode, and proceeds.
7. Payout becomes `processed`, claim becomes `paid`.

## Phase 3 Highlights
- Advanced fraud checks:
  - GPS spoofing suspicion from high drift
  - Speed / route outlier detection
  - Fake weather claim checks against deterministic historical baseline
  - Missing-proof escalation for severe claims
- Instant payout simulator:
  - UPI simulator
  - Razorpay test flow
  - Stripe sandbox flow
- Intelligent dashboards:
  - Worker: earnings protected, active weekly coverage, recent AI decisions
  - Admin: loss ratio, flagged claims, seven-day fraud trend, next-week claim prediction

## Repository Structure
- `client/` React frontend
- `server/` Express API
- `docker-compose.yml` MySQL local service

## Local Setup

### 1) Start MySQL
```bash
docker compose up -d
```

### 2) Configure environment files
```bash
copy server/.env.example server/.env
copy client/.env.example client/.env
```

Optional admin seed values in `server/.env` let you log in as an admin immediately after startup.

### 3) Install dependencies
```bash
npm install
```

### 4) Run both apps
```bash
npm run dev
```

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000/api/v1`

## Security and Sensitive Files
- Secrets are stored in `.env` files and must not be committed.
- Root `.gitignore` excludes:
  - all `.env` files except `.env.example`
  - `node_modules`
  - build outputs (`dist`)
  - logs and local/editor artifacts

## API Overview

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Policies
- `GET /api/v1/policies/catalog` (worker/admin)
- `GET /api/v1/policies/mine` (worker)
- `POST /api/v1/policies/catalog/:policyCode/buy` (worker)
- `POST /api/v1/policies/:policyId/cancel` (worker/admin)
- `GET /api/v1/policies` (admin)
- `POST /api/v1/policies` (admin)

### Premium
- `POST /api/v1/premium/quote`

### Claims
- `POST /api/v1/triggers/ingest` (worker)
- `GET /api/v1/claims` (worker own/admin all)
- `PATCH /api/v1/claims/:claimId/status` (admin)
- `DELETE /api/v1/claims/:claimId` (admin clear claim)

### Payouts
- `GET /api/v1/payouts` (worker own/admin all)
- `POST /api/v1/payouts/:payoutId/pay` (worker payment mode flow)

## UI Notes
- INR currency labels are used in UI.
- Claims page supports low/medium/high sliders for severity and weather risk.
- Trigger type auto-syncs from selected policy.
- Worker policy list hides cancelled policies after cancel action.

## Quality Commands
Run from repository root:
```bash
npm run typecheck -w server
npm run lint -w server
npm run typecheck -w client
npm run lint -w client
```

## Deploy Everything to Vercel

Use two Vercel projects from the same GitHub repository.

### 1) Deploy backend (Serverless API)
- Create a Vercel project with root directory set to `server`.
- Framework preset: `Other`.
- Vercel will serve:
  - `api/[[...route]].ts` as your API handler
  - `api/cron/trigger-sweep.ts` as a cron endpoint
- Add environment variables:
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_USER`
  - `MYSQL_PASSWORD`
  - `MYSQL_DATABASE`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_TTL`
  - `JWT_REFRESH_TTL`
  - `CLIENT_ORIGIN` (frontend URL)
  - `CRON_SECRET` (required for secure cron calls)

Notes:
- The serverless API still uses `/api/v1/*` routes.
- Cron schedule is configured in `server/vercel.json` (`*/5 * * * *`).

### 2) Deploy frontend (Vite SPA)
- Create a second Vercel project with root directory set to `client`.
- Framework preset: `Vite`.
- Add environment variable:
  - `VITE_API_URL=https://<your-backend-project>.vercel.app/api/v1`

Notes:
- SPA fallback rewrites are configured in `client/vercel.json`.

### 3) Post-deploy check
- Open frontend URL and log in.
- Confirm API health at:
  - `https://<backend-project>.vercel.app/api/v1/health`
- Confirm cron endpoint auth works manually:
  - `GET /api/cron/trigger-sweep` with header `Authorization: Bearer <CRON_SECRET>`

## Railway Backend Deployment

The repo now includes a root `railway.toml` that builds the `server` workspace and exposes:
- Health check: `/api/v1/health`
- Start command: `npm run start -w server`

Recommended Railway environment variables:
- `NODE_ENV=production`
- `PORT=4000`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `CLIENT_ORIGIN`
- `CRON_SECRET`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `ADMIN_SEED_NAME`

Submission support files:
- `docs/FINAL_SUBMISSION_PACKAGE.md`
- `docs/PITCH_DECK_OUTLINE.md`
