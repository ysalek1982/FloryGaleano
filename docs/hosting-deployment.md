# Hosting Deployment

Smart Family Meals is a Vite React single-page application. Vercel is the recommended hosting target because it provides preview deployments, production promotion, custom domains, and simple rollback controls without changing the Supabase backend model.

## Vercel Project Settings

- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22
- SPA fallback: configured in `vercel.json`

## Frontend Environment Variables

Set these in Vercel for preview and production. Do not commit real values.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV` (`preview`, `staging`, or `production`)
- `VITE_APP_VERSION` (commit SHA or release tag)
- `VITE_SENTRY_DSN` (optional)

## Preview Environment

Preview deployments should point to the staging Supabase project unless the branch is explicitly testing development data. Preview deploys must not use production service-role keys or production Gemini keys.

## Production Environment

Production deployments must point to the production Supabase project only. Use production publishable keys in the frontend and configure private keys only in Supabase Edge Function secrets or CI secrets.

## Domain Setup

1. Add the production domain in Vercel.
2. Configure DNS according to Vercel instructions.
3. Verify HTTPS is active.
4. Confirm Supabase redirect URLs include the production domain for login, register, password reset, and auth callbacks.

## Post-Deploy Smoke Checklist

- Landing page returns HTTP 200.
- `/login` loads.
- Unauthenticated `/app/dashboard` redirects to `/login`.
- Authenticated dashboard loads.
- Settings health panel shows Supabase and AI Chef status without secrets.
- Reports export controls render.
- ai-chef Edge Function returns structured JSON.
- No service role or Gemini key appears in browser source, network responses, or exported reports.

Public smoke script:

```powershell
$env:STAGING_URL="https://<staging-preview-url>"
npm run smoke:staging

$env:PRODUCTION_URL="https://<production-url>"
npm run smoke:production
```

## Rollback

Vercel rollback options:

- Use the Vercel dashboard to promote a prior deployment.
- Or run `vercel rollback <deployment-url-or-id>`.

If a database migration caused the incident, stop traffic first, inspect the migration, and apply a controlled corrective migration. Do not manually edit production schema from the dashboard unless it is an emergency and the fix is captured in a follow-up migration.
