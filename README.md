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

Not built yet: the editor UI, sign-in screens, template gallery, file uploads and payments.

## Local development

Requirements: Node 22 and PostgreSQL 16 (or Docker, see below). Without a database, the landing page and `/i/demo` still work.

```bash
npm install
cp apps/api/.env.example apps/api/.env      # then edit DATABASE_URL and JWT_SECRET
npm run db:generate
npm run db:migrate
npm run dev:api     # http://localhost:4000/api/health
npm run dev:web     # http://localhost:3000
```

The web app forwards `/api/*` to the API in development, so no CORS setup is needed.

Optional local database with Docker: `docker compose -f deploy/docker-compose.dev.yml up -d`.

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
