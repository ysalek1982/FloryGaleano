# Staging Dry-Run Checklist

Use this checklist before promoting Smart Family Meals toward production. The staging dry run must use a staging Supabase project and Vercel Preview/Staging environment variables only.

## 1. Supabase Staging Project

- [ ] Create a new Supabase staging project.
- [ ] Record the staging project ref in GitHub Actions as `SUPABASE_PROJECT_REF_STAGING`.
- [ ] Configure Supabase Auth email settings.
- [ ] Configure allowed redirect URLs for the staging Vercel preview URL and any staging custom domain.
- [ ] Link the staging project locally only when intentionally deploying staging:
  ```powershell
  npx supabase link --project-ref "<staging-project-ref>"
  ```
- [ ] Apply migrations:
  ```powershell
  npx supabase db push
  npx supabase migration list
  ```
- [ ] Set ai-chef Edge Function secrets:
  ```powershell
  npx supabase secrets set GEMINI_API_KEY="$env:GEMINI_API_KEY" --project-ref "<staging-project-ref>"
  npx supabase secrets set GEMINI_MODEL="$env:GEMINI_MODEL" --project-ref "<staging-project-ref>"
  npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" --project-ref "<staging-project-ref>"
  ```
- [ ] Deploy ai-chef:
  ```powershell
  npx supabase functions deploy ai-chef --project-ref "<staging-project-ref>"
  ```
- [ ] Verify RLS with staging credentials.
- [ ] Run staging smoke tests.
- [ ] Seed only staging-safe demo data. Do not copy production customer data into staging.

## 2. Vercel Preview/Staging

- [ ] Configure Preview environment variables in Vercel.
- [ ] Point Preview to the staging Supabase project.
- [ ] Set `VITE_APP_ENV=staging`.
- [ ] Set staging `VITE_SUPABASE_URL`.
- [ ] Set staging `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Set optional `VITE_SENTRY_DSN` only if a staging Sentry project exists.
- [ ] Confirm no production Supabase, Gemini, or service-role secrets are used in Preview.

## 3. GitHub Actions

- [ ] Configure the GitHub `staging` environment.
- [ ] Add staging environment secrets.
- [ ] Confirm workflow logs do not print secret values.
- [ ] Confirm remote Supabase QA runs sequentially.
- [ ] Confirm `.github/workflows/deploy-staging.yml` uses staging secrets only.
- [ ] Confirm `.github/workflows/deploy-production.yml` remains gated by the `production` environment.

## 4. Post-Deploy Smoke

- [ ] Landing loads.
- [ ] Login loads.
- [ ] Unauthenticated protected route redirects or renders the auth-guarded app shell.
- [ ] Authenticated dashboard loads.
- [ ] Recipe CRUD works.
- [ ] Menu Planner works.
- [ ] Portion Calculator works.
- [ ] Shopping export works.
- [ ] ai-chef responds with structured JSON.
- [ ] Runtime health panel shows `staging` environment.

Run:

```powershell
$env:STAGING_URL="https://<staging-preview-url>"
npm run smoke:staging
```
