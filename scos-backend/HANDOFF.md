# Clinic Backend Handoff

## Stack
- Runtime: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma ORM
- Realtime: Socket.IO with Redis-ready queue signaling
- Validation: Zod
- Auth: JWT access/refresh with hashed refresh token rotation
- Docs: OpenAPI served via Swagger UI
- Tests: Jest + Supertest integration baseline

## Runtime scripts
- `npm run dev` - Start API in watch mode
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled build
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests
- `npm run prisma:migrate` - Run Prisma migration
- `npm run prisma:seed` - Seed initial data

## Module map
- `src/modules/auth` - registration/login/refresh/logout
- `src/modules/users` - patient/doctor/admin profile management
- `src/modules/appointments` - booking, cancellation, rescheduling, walk-ins
- `src/modules/queue` - live queue state and next-patient prioritization
- `src/modules/records` - medical records timeline and record sharing
- `src/modules/prescriptions` - prescriptions and medicine conflict checks
- `src/modules/labs` - lab order/report lifecycle
- `src/modules/reviews` - review creation/update and doctor rating summary
- `src/modules/notifications` - list and read notifications
- `src/modules/admin` - clinic setup, search, analytics, user deactivation

## Security + ops
- `helmet`, `cors`, `express-rate-limit`, request compression
- Centralized error middleware with `ApiError` + Zod handling
- Audit logging for core state-changing flows
- RBAC through `authenticate` + `authorizeRoles`

## Environment prerequisites
Required env variables are validated at startup in `src/config/env.ts`:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`
- `BCRYPT_SALT_ROUNDS`
- `CORS_ORIGIN`
- `MAX_FILE_SIZE_MB`
- `LOG_LEVEL`

## Current validation status
- Build: passing
- Lint: passing
- Tests: passing (`src/tests/app.integration.test.ts`)

## Notes for next iteration
- Expand test coverage for auth service and DB-backed module workflows.
- Add queue and notification websocket integration tests.
- Add GitHub branch protections and required status checks for the new CI workflow.
