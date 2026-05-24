# Environment Strategy

Smart Family Meals separates local development, staging, and production by frontend environment variables, Supabase projects, Edge Function secrets, and deployment branches.

## Environments

| Environment | Purpose | Frontend `VITE_APP_ENV` | Supabase Project |
| --- | --- | --- | --- |
| Local development | Daily product development and QA | `development` | Development project |
| Staging | Release candidate validation | `staging` | Staging project |
| Production | Customer-facing app | `production` | Production project |

## Branch Strategy

- `develop` deploys to staging.
- `main` deploys to production.
- Feature branches create Vercel preview deployments.

## Variable Mapping

Frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV`
- `VITE_APP_VERSION`
- `VITE_SENTRY_DSN` (optional)

Backend, CLI, and QA variables:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY` or `APP_SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Hosting/CI variables:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SENTRY_AUTH_TOKEN` (optional for future source map upload)

## Edge Function Secrets

Set secrets separately per Supabase project:

```powershell
npx supabase secrets set GEMINI_API_KEY="$env:GEMINI_API_KEY" --project-ref "<project-ref>"
npx supabase secrets set GEMINI_MODEL="$env:GEMINI_MODEL" --project-ref "<project-ref>"
npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" --project-ref "<project-ref>"
```

Supabase may provide `SUPABASE_SERVICE_ROLE_KEY` automatically inside Edge Functions. `APP_SUPABASE_SERVICE_ROLE_KEY` is the optional custom fallback because Supabase rejects custom secrets beginning with `SUPABASE_`.

## Migration Deployment

Run migrations in this order:

1. Development project.
2. Staging project.
3. Production project after staging sign-off.

Commands:

```powershell
npx supabase link --project-ref "<project-ref>"
npx supabase db push
npx supabase migration list
npx supabase functions deploy ai-chef --project-ref "<project-ref>"
```

## Production Safeguards

- Do not run demo seed helpers against production.
- Do not expose QA panels to normal production users.
- Do not use development Supabase keys in production.
- Rotate keys before first public launch.
