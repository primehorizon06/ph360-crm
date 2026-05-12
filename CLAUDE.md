# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Instrucciones generales

- **Idioma de salida:** todas las respuestas deben generarse en español.

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint check

# Docker (preferred for full stack)
npm run docker:up        # Start all services (app + postgres)
npm run docker:down      # Stop services
npm run docker:migrate   # Run Prisma migrations inside container
npm run docker:seed      # Seed database
npm run docker:studio    # Open Prisma Studio

# Database (local)
npx prisma migrate dev   # Apply migrations + regenerate client
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Browse database
```

No test framework is configured in this project.

## Architecture

### Multi-tenant RBAC hierarchy

Data is scoped across a four-level hierarchy: **Company → Team → User → Lead**. The role system (`ADMIN | SUPERVISOR | COACH | AGENT`) drives which rows each user can see:

- `ADMIN`: all companies
- `SUPERVISOR`: own company
- `COACH`: own team within company
- `AGENT`: only their assigned leads

All Prisma queries that return user-visible data must go through `buildScopeFilter()` in [src/lib/permissions.ts](src/lib/permissions.ts). Bypassing it leaks cross-tenant data. Use `canAccessLead()` for single-record access checks.

### API route pattern

Every route handler that needs auth wraps itself with helpers from [src/lib/api.ts](src/lib/api.ts):

```ts
export const GET = withAuth(async (req, session) => { ... });
export const GET = withAuthParams(async (req, session, params) => { ... });
```

Response helpers (`unauthorized()`, `forbidden()`, `badRequest()`, etc.) are also in that file — use them instead of raw `NextResponse.json`.

### Session / auth

NextAuth is configured in [src/lib/auth.ts](src/lib/auth.ts) with a Credentials provider (username/email + bcrypt). The JWT carries `id`, `role`, `companyId`, `teamId`, and `companyName` so API routes never need an extra DB call just to scope a query. Session timeout is 1 hour; client-side refetch interval is 5 minutes (`providers.tsx`).

Extended types live in [src/types/next-auth.d.ts](src/types/next-auth.d.ts).

### Data fetching convention

Pages use **SWR** for all client-side fetching. Server components and API routes use Prisma directly. There is no React Query or fetch-on-mount pattern — if you see `useEffect` + `fetch`, it is legacy and should be migrated to SWR.

### Forms

All forms use **React Hook Form** + **Zod** for validation. Zod schemas are co-located with the component or in a shared `schemas/` file nearby. Do not mix controlled inputs with RHF register — use `Controller` for custom components.

### Environment variables

Validated at startup by a Zod schema in [src/env.ts](src/env.ts). Add new variables there before using them anywhere. Required: `DATABASE_URL`, `NEXTAUTH_SECRET`. Client-side variables must be prefixed `NEXT_PUBLIC_`.

### Styling

Tailwind CSS 4 with a Material Design 3 token set (`bg-background`, `text-on-surface`, etc.). Avoid raw hex colors or hardcoded Tailwind palette names — use the semantic tokens defined in globals.css so theming works correctly.

### Key domain concepts

| Term | Prisma model | Notes |
|---|---|---|
| Lead / Customer | `Lead` | Same model; `typeCustomer` field distinguishes prospect from customer |
| Goal | `Goal` | Bi-weekly periods ("quincenas"); can be scoped to company, team, or user |
| Product | `Product` | Services sold (e.g. `ALERTA_ANUAL`, `REPARACION_CREDITO`) |
| Reminder | `Reminder` | Task assigned to a user, not a calendar event |
| Notification | `Notification` | Delivered via SSE (`/api/notifications/stream`) |
