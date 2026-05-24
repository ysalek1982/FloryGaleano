# Staging Execution Runbook

This runbook is the operator package for creating and validating the real Smart Family Meals staging environment. Use placeholders only in shared notes. Never commit secret values.

## 1. Create Supabase Staging Project

Recommended project name: `smart-family-meals-staging`.

Choose the same region you expect to use for production unless there is a latency, compliance, or cost reason to test another region. Record these values in a private password manager or GitHub environment secrets, not in source control:

- Staging project ref: `<STAGING_PROJECT_REF>`
- Staging project URL: `<STAGING_SUPABASE_URL>`
- Staging publishable or anon key: `<STAGING_SUPABASE_PUBLISHABLE_KEY>`
- Staging database password: `<STAGING_DB_PASSWORD>`
- Staging service role key: `<STAGING_SERVICE_ROLE_KEY>`

The service role key is private. It must never be set as a Vercel frontend variable.

## 2. Link Staging Project Locally

Run these from the repository root with placeholder values replaced in your local shell only:

```powershell
npx supabase link --project-ref <STAGING_PROJECT_REF>
npx supabase db push
npx supabase migration list
```

Do not make manual schema edits in the Supabase dashboard. If a migration fails, fix the migration or create a corrective migration.

## 3. Deploy Edge Function to Staging

Set staging Edge Function secrets in the staging Supabase project:

```powershell
npx supabase secrets set GEMINI_API_KEY="<STAGING_GEMINI_API_KEY>"
npx supabase secrets set GEMINI_MODEL="gemini-2.5-flash"
npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="<STAGING_SERVICE_ROLE_KEY>"
npx supabase functions deploy ai-chef
```

`APP_SUPABASE_SERVICE_ROLE_KEY` is the optional custom fallback. Supabase may provide `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions automatically.

## 4. Configure Supabase Auth Staging

In Supabase Auth settings:

- Site URL: `https://<staging-preview-url>.vercel.app`
- Redirect URLs:
  - `https://<staging-preview-url>.vercel.app/*`
  - `http://localhost:5173/*` if local staging auth testing is needed
  - Any staging custom domain URL
- Confirm password reset and email confirmation links point to staging.

## 5. Configure Vercel Preview Environment Variables

Set these in Vercel Preview only:

- `VITE_SUPABASE_URL=<STAGING_SUPABASE_URL>`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<STAGING_SUPABASE_PUBLISHABLE_KEY>`
- `VITE_APP_ENV=staging`
- `VITE_APP_VERSION=<commit-sha-or-release-candidate>`
- `VITE_SENTRY_DSN=<STAGING_SENTRY_DSN>` if available

Do not set database passwords, service role keys, Supabase access tokens, or Gemini keys as Vercel frontend variables.

## 6. Configure GitHub Staging Environment Secrets

Create a GitHub environment named `staging`. Add:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_STAGING`
- `SUPABASE_DB_PASSWORD_STAGING`
- `STAGING_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `STAGING_GEMINI_API_KEY`
- `STAGING_GEMINI_MODEL`
- `STAGING_APP_SUPABASE_SERVICE_ROLE_KEY` if needed
- `STAGING_VITE_SUPABASE_URL`
- `STAGING_VITE_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_VITE_SENTRY_DSN` if available

## 7. Run `deploy-staging.yml`

Options:

- From GitHub Actions UI: run `Smart Family Meals Staging Deploy`.
- Or push to `develop` if branch deployment is enabled.

The workflow must run CI first, apply migrations to staging only, deploy `ai-chef` to staging only, deploy a Vercel Preview build, and run post-deploy smoke when `STAGING_URL` exists.

## 8. Run Smoke

From a local shell:

```powershell
$env:STAGING_URL="https://your-preview-url.vercel.app"
npm run smoke:staging
```

Or in bash:

```bash
STAGING_URL="https://your-preview-url.vercel.app" npm run smoke:staging
```

## 9. Validate Runtime Health Panel

Log in to staging and open Settings:

- App environment shows `staging`.
- Supabase host is the staging Supabase host.
- AI Chef status is visible.
- Monitoring status is visible.
- Export capability is visible.
- Current role is visible.
- No secrets or key-like values are displayed.

## 10. Manual Staging QA Checklist

- [ ] Login
- [ ] Families
- [ ] Diners
- [ ] Ingredients
- [ ] Recipes
- [ ] Recipe image
- [ ] Menu Planner
- [ ] Day Planner
- [ ] Portion Calculator
- [ ] Pantry
- [ ] Freezer
- [ ] Shopping
- [ ] Alerts
- [ ] Reports exports
- [ ] AI Chef
- [ ] Settings
