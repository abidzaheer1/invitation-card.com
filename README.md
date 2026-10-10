# Invitation-card.com

A SaaS where people sign in (or continue as a guest) and build invitation websites for weddings, engagements, birthdays and any other gathering. Templates are based on the event type, and invitations can include 3D elements and RSVP forms (default or custom) for visitors.

## Structure

```
apps/web         Next.js 16 (App Router, TypeScript, Tailwind 4, React Three Fiber)
apps/api         NestJS 11 + Prisma + PostgreSQL
packages/shared  Types and constants used by both (invitation JSON schema, RSVP fields)
deploy/          Docker Compose, Caddy, server setup and backup scripts
docs/            Deployment guide
```

An invitation is stored as JSON (`InvitationContent` in `packages/shared`). The same JSON renders the editor preview and the published page, so the editor and the live site never drift apart.

## What works today

- Landing page with a live 3D scene.
- Public invitation page at `/i/<slug>`, server-rendered with share previews. `/i/demo` is a sample that needs no database.
- RSVP form with default and custom fields.
- API: guest sessions, register/login (a guest upgrades in place and keeps their invitations), invitation CRUD, public invitation and RSVP endpoints, health check, rate limiting.

Not built yet: payments, email verification and password reset, per-plan limits.

## Local development

Requirements: Node 22. No database or Docker is needed.

```bash
npm install
npm run dev:local   # API on http://localhost:4000 with an embedded Postgres (PGlite), data in apps/api/.local-db
npm run dev:web     # in a second terminal: http://localhost:3000
```

The web app forwards `/api/*` to the API in development, so no CORS setup is needed. Uploads are stored in `apps/api/uploads`.

To use a real PostgreSQL 16 instead: copy `apps/api/.env.example` to `apps/api/.env`, set `DATABASE_URL` and `JWT_SECRET`, run `npm run db:migrate`, then `npm run dev:api`.

Google sign-in appears once `GOOGLE_CLIENT_ID` is set for the API (an OAuth 2.0 Web client id; add your site origin as an authorised JavaScript origin). Without it, email sign-in is the only option.

Nobody has to sign in to design an invitation: a guest session is created quietly the first time they pick a design. Signing in is asked for only when publishing, and drafts move into the account.

## API overview

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/guest` | Creates a guest session |
| POST | `/api/auth/register` | Send the guest token to upgrade that guest |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | |
| POST/GET | `/api/invitations` | Create, list mine |
| GET/PATCH/DELETE | `/api/invitations/:id` | Owner only |
| GET | `/api/invitations/:id/responses` | RSVP responses, owner only |
| GET | `/api/public/invitations/:slug` | Published invitations only |
| POST | `/api/public/invitations/:slug/rsvp` | Rate limited |
| GET | `/api/health` | |

## Deployment

Runs on a single VPS (Hostinger KVM 1 to start) with Docker Compose and Caddy for automatic HTTPS. GitHub Actions builds the images, so the server never builds anything. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
