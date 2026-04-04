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
- Optionally attach proof image URL while creating trigger claim
- Track claim status (`pending`, `approved`, `rejected`, `paid`)
- View payouts and complete payout using payment mode:
  - `upi`
  - `bank_account`
  - `online_wallet`

### Admin Module
- View all claims across workers
- Approve or reject pending claims
- Clear claims (admin-only)
- View all payouts across workers
- View payout owner (worker ID) and payment status

## Business Flow
1. Worker buys policy from catalog.
2. Worker triggers event from Claims page.
3. System creates claim with `under_review` (pending).
4. Admin reviews and approves/rejects.
5. If approved, payout is queued.
6. Worker opens Payouts page, chooses payment mode, and proceeds.
7. Payout becomes `processed`, claim becomes `paid`.

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
