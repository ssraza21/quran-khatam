# Quran Khatam

A web app for coordinating community Quran recitation circles (_khatams_). Participants claim and complete one of the 120 quarter-sections (30 Juz × 4 quarters) of the Quran. Supports multiple sequential khatams under a shared slug, real-time progress tracking, an interactive globe, and admin controls.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Backend | Hono 4 on Cloudflare Workers |
| Database | Supabase (PostgreSQL + Realtime + RLS) |
| Deploy | Wrangler / Cloudflare Workers |

## Features

- Create a khatam with a URL slug and admin PIN
- 120-slot grid (30 Juz × 4 quarters) with live status updates via Supabase Realtime
- Claim up to 8 slots; mark them complete when done
- Auto-detects khatam completion; admin can start the next one
- Admin panel: override slot status, reset Juz or full khatam, delete khatam
- Interactive globe showing participant locations
- Solo mode for personal tracking

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Cloudflare](https://cloudflare.com) account with Workers enabled

### 1. Clone and install

```bash
git clone https://github.com/ssraza21/quran-khatam.git
cd quran-khatam
npm install
```

### 2. Set up the database

Run `supabase/migration.sql` in the Supabase SQL Editor. This creates the schema, tables, indexes, RLS policies, and enables Realtime.

### 3. Configure environment

Create a `.dev.vars` file (gitignored) for local development:

```
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

Update `wrangler.json` with your Supabase project URL:

```json
"vars": {
  "SUPABASE_URL": "https://your-project.supabase.co"
}
```

Update `src/react-app/lib/supabase.ts` with your Supabase URL and anon key (the anon key is safe to expose — it's read-only and protected by RLS).

### 4. Run locally

```bash
npm run dev
```

App available at [http://localhost:5173](http://localhost:5173).

## Deployment

```bash
# Validate (TypeScript + build + wrangler dry-run)
npm run check

# Set your service key as a Wrangler secret
npx wrangler secret put SUPABASE_SERVICE_KEY

# Deploy to Cloudflare Workers
npm run deploy
```

## Development Commands

```bash
npm run dev        # Dev server with HMR (port 5173)
npm run build      # Build for production
npm run lint       # ESLint
npm run check      # Full pre-deploy validation
npm run preview    # Build and serve locally
npm run deploy     # Deploy to Cloudflare Workers
```

## Project Structure

```
src/
  react-app/          # Frontend SPA
    components/
      khatam/         # Domain components
      layout/         # Navbar, Footer
      ui/             # shadcn-based primitives
    pages/            # LandingPage, KhatamPage, MetricsPage
    hooks/            # useKhatamState (all client state + subscriptions)
    lib/              # api.ts, types.ts, constants.ts, helpers.ts
  worker/             # Cloudflare Worker (API)
    index.ts          # All Hono routes
    lib/              # pin.ts, supabase.ts, validators.ts
supabase/
  migration.sql       # Full DB schema
```

## Security Notes

- Admin PINs (4–6 digits) are stored as salted SHA-256 hashes — never in plaintext
- The Supabase service key (full DB access) is never exposed to the frontend
- The anon key is read-only and enforced by RLS policies
- All writes go through the Cloudflare Worker, which validates PINs server-side

## License

MIT — see [LICENSE](LICENSE).
