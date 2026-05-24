# Smart Family Meals

Chef Menu Intelligence for Families, by Flor & Galeano.

This is a bilingual React, TypeScript, Vite, Tailwind CSS, Supabase, and Gemini-ready SaaS foundation for private chefs, family chefs, and nutrition-oriented meal administrators.

## Features

- English-first UI with full Spanish support through `react-i18next`
- Public landing page plus login, register, and password reset routes
- Protected `/app` workspace with sidebar, top search, language switcher, and responsive modules
- Dashboard, families, diners, ingredients, recipes, menu planner, day planner, portion calculator, shopping list, pantry, freezer, allergy shield, nutrition, alerts, AI Chef, reports, and settings
- Local demo workspace with realistic Galeano Family seed data
- Reusable engines for portions, nutrition, allergy safety, menu rotation, alerts, and AI validation
- Supabase PostgreSQL schema with UUIDs, RLS policies, profile roles, and seed data
- Supabase Edge Function for Gemini calls through backend only

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run security:scan
```

The local dev URL used during QA was:

```text
http://127.0.0.1:5173/
```

## Environment

Copy `.env.example` to `.env.local` for frontend Supabase auth:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Development project:

```text
SUPABASE_PROJECT_REF=bmcwbagzykmnyurresel
VITE_SUPABASE_URL=https://bmcwbagzykmnyurresel.supabase.co
```

Set Gemini only as a Supabase Edge Function secret:

```bash
supabase secrets set GEMINI_API_KEY="$env:GEMINI_API_KEY"
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
```

Do not expose Gemini keys in the browser.

## Publish To GitHub And Vercel

The GitHub repository should use this project root as the Vercel root directory:

```text
C:\Users\DELL\OneDrive\Documentos\FLOR Y GALEANO
```

Vercel settings:

- Framework preset: `Vite`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: leave empty or set to repository root

Frontend variables for Vercel:

```text
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
VITE_APP_ENV=production
VITE_APP_VERSION=<release-or-commit>
```

Never add service role, database password, Supabase access token, or Gemini keys to Vercel frontend variables.

The deployment configuration is already included:

- `vercel.json` for SPA routing, security headers, and cache headers.
- `.vercelignore` to avoid uploading local env files, logs, test output, build output, and dependencies.
- `.github/workflows/ci.yml` for validation.
- `.github/workflows/deploy-staging.yml` and `.github/workflows/deploy-production.yml` for gated deployments when secrets are configured.

## Database

Main migration:

```text
supabase/migrations/20260523152000_initial_schema.sql
```

Seed file:

```text
supabase/seed.sql
```

Edge Function:

```text
supabase/functions/ai-chef/index.ts
```

Remote deployment commands:

```bash
npx supabase link --project-ref bmcwbagzykmnyurresel
npx supabase db push
npx supabase migration list
npx supabase secrets set GEMINI_API_KEY="$env:GEMINI_API_KEY"
npx supabase secrets set GEMINI_MODEL="$env:GEMINI_MODEL"
npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
npx supabase functions deploy ai-chef
```

## Demo Login

When Supabase env vars are not configured, use the login page button labeled `Use demo workspace`. Data is persisted in browser local storage so the app remains usable without a backend during product review.
