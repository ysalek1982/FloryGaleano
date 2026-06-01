# Deployment Readiness

Companion release documents:

- `docs/hosting-deployment.md`
- `docs/environment-strategy.md`
- `docs/env-matrix.md`
- `docs/staging-dry-run-checklist.md`
- `docs/staging-execution-runbook.md`
- `docs/vercel-staging-dry-run.md`
- `docs/github-actions-secrets-checklist.md`
- `docs/release-candidate-checklist.md`
- `docs/supabase-production-readiness.md`
- `docs/monitoring-plan.md`
- `docs/production-key-rotation.md`
- `docs/final-launch-checklist.md`

## Required Frontend Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

Run:

```bash
npm run validate:env
```

The validator prints only present/missing status, never values.

## Supabase Project Setup

```bash
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
npx supabase migration list
```

Do not make manual dashboard schema edits unless a production incident requires it and the follow-up migration is created immediately.

## Edge Function Secrets

```bash
npx supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
npx supabase secrets set GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
npx supabase secrets set APP_USER_SECRET_ENCRYPTION_KEY="$APP_USER_SECRET_ENCRYPTION_KEY"
```

`SUPABASE_SERVICE_ROLE_KEY` is reserved by Supabase and may already be available inside Edge Functions. Use `APP_SUPABASE_SERVICE_ROLE_KEY` only as the optional custom fallback.

## Edge Function Deployment

```bash
npx supabase functions deploy ai-chef
npx supabase functions deploy ai-key-manager
```

Post-deploy checks:

```bash
npm run smoke
npm run test:supabase
```

## Build and Test Commands

```bash
npm ci
npm run validate:env
npm run build
npm run lint
npm test
npm run security:scan
npm audit --omit=dev
npm run test:e2e
npm run test:rls
npm run test:supabase
npm run smoke
```

Remote tests require development QA credentials and Supabase service-role access in the environment. CI skips remote tests when those variables are missing.

## CI Requirements

- Node 22.
- `npm ci`.
- Environment validation when frontend secrets are configured.
- Security scan, lint, unit tests, build, and production dependency audit.
- Playwright and remote QA only when the required secrets are configured.
- Optional Vercel preview deploy only when Vercel secrets are configured.
- Never echo secret values in workflow steps.

## Rollback Notes

- Frontend rollback: redeploy the previous successful build artifact.
- Database rollback: prefer forward corrective migrations. Avoid destructive rollback on production data.
- Edge Function rollback: redeploy the previous known-good `ai-chef` function bundle.

## Post-Deploy Smoke Checklist

- Landing page loads.
- Login page loads.
- Unauthenticated `/app/dashboard` redirects to `/login`.
- Authenticated dashboard loads seeded or production data.
- Reports page renders print layout.
- Export Excel and CSV download events work.
- `ai-chef` ping/smoke returns structured JSON.
- Viewer user cannot create, edit, or delete operational records.
- English and Spanish language switching works.

## Production Key Rotation Checklist

- Rotate Supabase access token.
- Rotate Supabase service role key.
- Rotate Gemini API key.
- Replace development QA users.
- Confirm old keys are removed from local machines, CI secrets, and Supabase secrets.
