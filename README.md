# pakt

A mobile-first PWA for managing a move: label boxes with QR codes, track their contents, and find anything at a glance. Rules-based (no AI), single-operator by design.

## Stack

- **Next.js 16** (App Router, React 19, `proxy.ts` instead of `middleware.ts`)
- **Neon Postgres** + **Drizzle ORM** (versioned SQL migrations)
- **Neon Auth** (`@neondatabase/auth`)
- **Vercel Blob** for photos
- **Tailwind 4** + **shadcn/ui** + **Base UI**
- **Vitest** for tests, **pnpm** as the package manager

> Heads up: this project runs Next.js 16. APIs and conventions have breaking changes vs. older versions — consult `node_modules/next/dist/docs/` before writing framework code.

## Prerequisites

- Node.js 20+ (LTS recommended)
- `pnpm` (`npm i -g pnpm`)
- Access to the shared Neon project and Vercel project (ask the maintainer to add you)

## Getting set up

### 1. Clone and install

```bash
git clone <repo-url> pakt
cd pakt
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

You'll need:

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | Neon project → connection string (pooled) |
| `NEON_AUTH_BASE_URL` | Neon project → Auth tab |
| `NEON_AUTH_COOKIE_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `BLOB_READ_WRITE_TOKEN` | Vercel project → Storage → Blob |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

> pakt uses a single Neon DB and Blob store across dev and prod by design (it's a single-operator tool). Don't create separate environments.

### 3. Run migrations

Apply the existing versioned migrations in `src/db/migrations/` to your database:

```bash
pnpm db:migrate
```

Optionally seed sample data:

```bash
pnpm db:seed
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Everyday commands

```bash
pnpm dev            # Next dev server
pnpm build          # production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest (one-shot)
pnpm test:watch     # vitest (watch)
```

### Database workflow

Schema lives in `src/db/schema.ts`. **Always** use generate + migrate — never `drizzle-kit push`. Every schema change produces a versioned SQL file in `src/db/migrations/` that gets committed.

```bash
pnpm db:generate    # after editing schema.ts, generates a new migration SQL file
pnpm db:migrate     # applies pending migrations
pnpm db:studio      # Drizzle Studio (browse the DB in your browser)
```

Commit the generated SQL alongside the schema change.

## Project layout

```
src/
├── app/           # Next.js App Router routes
├── actions/       # Server actions
├── components/    # React components (incl. shadcn/ui primitives)
├── db/
│   ├── schema.ts        # Drizzle schema (source of truth)
│   ├── migrations/      # Versioned SQL — commit every change
│   ├── index.ts         # DB client
│   └── seed.ts
├── lib/
│   └── auth/      # Neon Auth integration (lazy proxy)
└── proxy.ts       # Next 16 request proxy (replaces middleware.ts)
```

## Contributing

1. Branch off `main`.
2. Make your changes. Keep commits focused.
3. Before opening a PR, run:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```
4. If you touched the schema, confirm a new file exists in `src/db/migrations/` and that `pnpm db:migrate` applies cleanly.
5. Open a PR against `main`. Preview deployments run automatically on Vercel.

## Deployment

Pushes to `main` deploy to production via Vercel. PRs get preview deployments. Environment variables are managed in the Vercel project dashboard — keep `.env.example` in sync whenever you add a new variable.
