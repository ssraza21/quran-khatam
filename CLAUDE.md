# CLAUDE.md — Quran Khatam

This file provides context for AI assistants (Claude and others) working in this repository.

## Project Overview

**Quran Khatam** is a full-stack web app for coordinating community Quran recitation circles (_khatams_). Participants claim and complete one of the 120 quarter-sections (30 Juz × 4 quarters) of the Quran. The app supports multiple khatams under a shared slug, real-time progress tracking, and admin controls.

Live app: deployed on Cloudflare Workers with Supabase as the database.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui (base-nova theme), Base UI |
| Animations | Motion, Cobe (globe) |
| Build | Vite 6 |
| Backend | Hono 4 on Cloudflare Workers |
| Database | Supabase (PostgreSQL + Realtime + RLS) |
| Deploy | Wrangler / Cloudflare Workers |

---

## Repository Structure

```
quran-khatam/
├── src/
│   ├── react-app/               # Frontend SPA
│   │   ├── components/
│   │   │   ├── khatam/          # Domain components (JuzRow, QCard, SlotDrawer, KhatamSelector)
│   │   │   ├── layout/          # Layout, Navbar, Footer
│   │   │   └── ui/              # Generic UI primitives (shadcn-based)
│   │   ├── pages/               # LandingPage, KhatamPage, MetricsPage
│   │   ├── hooks/
│   │   │   └── useKhatamState.ts  # All client state & Supabase subscriptions
│   │   ├── lib/
│   │   │   ├── api.ts           # Typed API client (fetch wrappers)
│   │   │   ├── constants.ts     # JUZ_NAMES, Q_LABELS, COLORS
│   │   │   ├── helpers.ts       # makeDummySlots, timeAgo, isStale
│   │   │   ├── supabase.ts      # Supabase anon client (read-only)
│   │   │   └── types.ts         # Slot, StatusKey, KhatamPublic interfaces
│   │   ├── App.tsx              # Router setup
│   │   └── main.tsx             # Entry point
│   └── worker/                  # Cloudflare Worker (API)
│       ├── index.ts             # All Hono routes
│       └── lib/
│           ├── pin.ts           # SHA-256 PIN hashing/verification
│           ├── supabase.ts      # Supabase service-key client (full access)
│           └── validators.ts    # isValidSlug, isValidPin
├── supabase/
│   └── migration.sql            # Full DB schema with RLS
├── public/                      # Static assets
├── vite.config.ts
├── wrangler.json                # Cloudflare Worker config
├── tsconfig.json                # Root (references app + node + worker)
├── tsconfig.app.json
├── tsconfig.worker.json
├── components.json              # shadcn/ui config
└── eslint.config.js
```

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (port 5173, HMR enabled)
npm run build        # tsc -b && vite build  →  dist/client
npm run lint         # ESLint
npm run check        # tsc + build + wrangler dry-run (pre-deploy validation)
npm run deploy       # wrangler deploy (production)
npm run preview      # Build then serve locally
npm run cf-typegen   # Regenerate Worker env types from wrangler.json
```

---

## TypeScript Configuration

Three separate tsconfig files form a monorepo:

- `tsconfig.app.json` — React SPA (`src/react-app/**`)
- `tsconfig.worker.json` — Cloudflare Worker (`src/worker/**`)
- `tsconfig.node.json` — Vite config / Node tooling
- `tsconfig.json` — Root that references all three

Path alias: `@/*` → `./src/react-app/*` (configured in both tsconfig and vite.config.ts).

---

## Database Schema

**Schema**: `khatam_public`

### `khatams` table
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `slug` | TEXT | URL-friendly identifier |
| `name` | TEXT | Display name |
| `pin_hash` | TEXT | Salted SHA-256 of admin PIN |
| `khatam_num` | INT | Increments with each new khatam in a series |
| `created_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | NULL until all 120 slots are done |

Unique constraint: `(slug, khatam_num)`.

### `slots` table
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `khatam_id` | BIGINT FK | Cascades on delete |
| `juz` | SMALLINT | 1–30 |
| `q` | SMALLINT | 1–4 (quarter within juz) |
| `status` | TEXT | `'av'` / `'cl'` / `'dn'` |
| `claimed_by` | TEXT | Name of person who claimed |
| `claimed_at` | TIMESTAMPTZ | |
| `done_at` | TIMESTAMPTZ | |

Unique constraint: `(khatam_id, juz, q)`. Total slots per khatam: **120**.

### RLS Policy
- **Anonymous role**: SELECT only (frontend uses anon key)
- **Service role**: ALL (Worker uses service key)
- Realtime enabled on both tables for live UI updates

---

## API Routes (Cloudflare Worker — Hono)

All routes are under `/api/khatams`.

### Public
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/khatams` | Create a khatam (slug, name, PIN) |
| `GET` | `/api/khatams/:slug` | Get latest khatam for slug |
| `GET` | `/api/khatams/:slug/history` | Get all khatams under slug |
| `POST` | `/api/khatams/:slug/verify-pin` | Verify admin PIN |
| `POST` | `/api/khatams/:slug/claim` | Claim a quarter (max 8 active per user) |
| `POST` | `/api/khatams/:slug/complete` | Mark quarter done (triggers completion check) |

### Admin (PIN-protected)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/khatams/:slug/admin/set-status` | Override slot status |
| `POST` | `/api/khatams/:slug/admin/reset-all` | Reset all slots to `av` |
| `POST` | `/api/khatams/:slug/admin/reset-juz` | Reset a specific Juz |
| `POST` | `/api/khatams/:slug/admin/new-khatam` | Start next khatam in series |
| `DELETE` | `/api/khatams/:slug/admin/delete` | Delete khatam |

The Worker validates PINs via `verifyAdmin()` which calls `lib/pin.ts`.

---

## Domain Concepts

- **Khatam**: A complete recitation of the Quran divided among participants.
- **Juz** (plural: Ajza): One of 30 equal parts of the Quran. Each Juz has 4 quarters.
- **Slot**: One quarter of one Juz (`juz` 1–30, `q` 1–4). There are 120 slots per khatam.
- **Status values**:
  - `av` — available (default)
  - `cl` — claimed (someone is reading it)
  - `dn` — done (completed)
- **Slug**: URL-friendly identifier for a khatam group (e.g. `family-ramadan-2025`). A slug can host multiple sequential khatams (`khatam_num` 1, 2, 3…).
- **Stale claim**: A slot claimed more than 1 hour ago and still `cl` (see `isStale()` in `helpers.ts`).

---

## Key Conventions

### Frontend
- **State management**: All async state lives in `useKhatamState.ts`. Do not add parallel state hooks for khatam data.
- **API calls**: Always go through `src/react-app/lib/api.ts` — never call `fetch` directly in components.
- **Supabase subscriptions**: The `useKhatamState` hook subscribes to Postgres Changes on the `slots` table. Changes from the Worker auto-propagate to all connected clients.
- **Colors**: Status colors are defined in `constants.ts` (`COLORS.av`, `COLORS.cl`, `COLORS.dn`). Use these — do not hardcode colors for slot status.
- **Imports**: Use the `@/` alias for all imports within `src/react-app/`.
- **Styling**: Tailwind utility classes preferred. The brand primary color is `#8B0000` (dark red). Avoid inline styles except for dynamic values.
- **No test suite** exists currently. If adding tests, use Vitest (compatible with Vite).

### Backend (Worker)
- **Service key only**: The Worker's Supabase client uses `SUPABASE_SERVICE_KEY` (bypasses RLS). Never expose this to the frontend.
- **PIN security**: PINs are 4–6 digits, stored as salted SHA-256 hashes. See `lib/pin.ts`.
- **Slug validation**: 3–60 chars, lowercase alphanumeric + hyphens. Validated via `isValidSlug()`.
- **Error format**: Return `{ error: "message" }` with appropriate HTTP status codes.
- **Completion check**: After any `complete` action, `checkCompletion()` runs. If all 120 slots are `dn`, it sets `completed_at` on the khatam.
- **Claim limit**: Users are limited to 8 active (`cl`) slots per khatam.

### Git
- Active development branch: feature branches off `main`
- Commit messages are short and descriptive (see git log for style)
- No CI/CD pipeline configured

---

## Environment Variables

### Worker (set via Wrangler secrets / `wrangler.json`)
| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | `wrangler.json` vars | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Wrangler secret (not in repo) | Service role key (full DB access) |

For local development, set secrets in `.dev.vars` (gitignored):
```
SUPABASE_SERVICE_KEY=your_service_key_here
```

### Frontend (hardcoded in `src/react-app/lib/supabase.ts`)
The Supabase URL and anon key are hardcoded — this is intentional for a public read-only client. The anon key is safe to expose.

---

## Deployment

```bash
# Build and dry-run validation
npm run check

# Deploy to Cloudflare Workers production
npm run deploy
```

The Vite build outputs to `dist/client`. The Worker serves the SPA from that directory with SPA fallback (all unmatched routes return `index.html`). API routes (`/api/*`) are handled by the Worker before reaching the static assets.

Worker config: `wrangler.json` — name `quran-khatam`, compatibility date `2025-10-08`.

---

## Adding New Features — Checklist

1. **New API endpoint**: Add route in `src/worker/index.ts`. Add input validation in `lib/validators.ts` if needed. Add typed wrapper in `src/react-app/lib/api.ts`.
2. **New UI component**: Place domain-specific components in `src/react-app/components/khatam/`, generic UI in `components/ui/`.
3. **New DB column/table**: Write a migration SQL file in `supabase/`. Update `types.ts`. Update RLS if needed.
4. **New page**: Add to `src/react-app/pages/`, register route in `App.tsx`.
5. **New constants**: Add to `src/react-app/lib/constants.ts`.
