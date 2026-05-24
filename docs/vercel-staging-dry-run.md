# Vercel Staging Dry Run

Use Vercel Preview deployments as the staging host. Preview must point to staging Supabase and must not use production secrets.

## 1. Connect Repository

1. Import the repository into Vercel.
2. Select the project root.
3. Use Vite framework detection.
4. Confirm build command is `npm run build`.
5. Confirm output directory is `dist`.

## 2. Configure Preview Environment Variables

Set these in Vercel Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_ENV=staging`
- `VITE_APP_VERSION`
- Optional `VITE_SENTRY_DSN`

Do not set service-role keys, Gemini keys, Supabase access tokens, or database passwords in frontend Preview variables.

## 3. Deploy a Preview Build

Git integration will deploy feature branches automatically. For a controlled CI dry run, use:

```bash
npm install -g vercel@39
vercel pull --yes --environment=preview --token="$VERCEL_TOKEN"
vercel build --token="$VERCEL_TOKEN"
vercel deploy --prebuilt --token="$VERCEL_TOKEN"
```

## 4. Confirm Preview Uses Staging Supabase

- Open Settings.
- Confirm Runtime Health shows `staging`.
- Confirm Supabase host matches the staging Supabase project host.
- Confirm production data does not appear.
- Confirm demo seed behavior is limited to staging-safe workflows.

## 5. Inspect Build Logs

In Vercel:

- Check install, build, and output logs.
- Confirm no secrets are printed.
- Confirm no large chunk warnings appear.
- Confirm `vercel.json` rewrites and headers are accepted.

## 6. Post-Deploy Smoke

Set:

```bash
STAGING_URL=https://<preview-url>
```

Run:

```bash
npm run smoke:staging
```

Then manually verify login, dashboard, recipes, menu planner, reports export, and ai-chef health.

## 7. Rollback or Redeploy

- Preview redeploy: push a corrective commit or rerun the workflow.
- Preview rollback: promote a previous known-good preview only if it points to the correct staging environment.
- Production rollback remains separate and must use production approval.

## 8. Promotion Gate

Promote to production only after:

- Staging checklist is complete.
- Remote RLS and Supabase QA pass against staging.
- E2E passes against staging or a trusted preview.
- Production key rotation checklist is complete.
- Launch checklist is signed off.
