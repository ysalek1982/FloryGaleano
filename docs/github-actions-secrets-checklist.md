# GitHub Actions Secrets Checklist

Use GitHub environments to separate staging and production. Never reuse a staging secret in production or a production secret in staging.

## Staging Environment Secrets

- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `SUPABASE_PROJECT_REF_STAGING`
- [ ] `SUPABASE_DB_PASSWORD_STAGING`
- [ ] `STAGING_URL`
- [ ] `STAGING_VITE_SUPABASE_URL`
- [ ] `STAGING_VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `STAGING_GEMINI_API_KEY`
- [ ] `STAGING_GEMINI_MODEL`
- [ ] `STAGING_APP_SUPABASE_SERVICE_ROLE_KEY` if needed
- [ ] `VERCEL_TOKEN` if workflow deploys to Vercel
- [ ] `VERCEL_ORG_ID` if workflow deploys to Vercel
- [ ] `VERCEL_PROJECT_ID` if workflow deploys to Vercel

## Production Environment Secrets

- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `SUPABASE_PROJECT_REF_PRODUCTION`
- [ ] `SUPABASE_DB_PASSWORD_PRODUCTION`
- [ ] `PRODUCTION_URL`
- [ ] `PROD_VITE_SUPABASE_URL`
- [ ] `PROD_VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `PROD_GEMINI_API_KEY`
- [ ] `PROD_GEMINI_MODEL`
- [ ] `PROD_APP_SUPABASE_SERVICE_ROLE_KEY` if needed
- [ ] `VERCEL_TOKEN` if workflow deploys to Vercel
- [ ] `VERCEL_ORG_ID` if workflow deploys to Vercel
- [ ] `VERCEL_PROJECT_ID` if workflow deploys to Vercel

## Rules

- Staging secrets must not point to production.
- Production secrets must not point to staging.
- Secrets must not be echoed in logs.
- Workflow diagnostics may print present/missing status only.
- Remote Supabase QA must run sequentially.
- Production deploy must require GitHub environment approval.
- Production post-deploy smoke must have `PRODUCTION_URL`.
- Service role and Gemini keys never belong in Vercel frontend variables.
