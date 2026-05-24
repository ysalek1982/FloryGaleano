# Environment Variable Matrix

This matrix separates frontend-safe variables from private deployment and Edge Function secrets. Do not include real values in documentation or committed files.

## Local Development

| Variable | Safe for frontend | Required | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Yes | Development Supabase URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes, unless anon key is used | Preferred browser key. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Optional fallback | Legacy anon key name. |
| `VITE_APP_ENV=development` | Yes | Optional | Defaults to Vite mode if missing. |
| `VITE_APP_VERSION` | Yes | Optional | Use a local version, commit SHA, or `0.0.0`. |

## Staging Frontend

| Variable | Safe for frontend | Required | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Yes | Must point to staging Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Staging publishable key only. |
| `VITE_APP_ENV=staging` | Yes | Yes | Enables staging runtime visibility. |
| `VITE_APP_VERSION` | Yes | Yes | Use commit SHA or release candidate tag. |
| `VITE_SENTRY_DSN` | Yes | Optional | Only if staging Sentry exists. |

## Production Frontend

| Variable | Safe for frontend | Required | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Yes | Must point to production Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Production publishable key only. |
| `VITE_APP_ENV=production` | Yes | Yes | Enables production safeguards. |
| `VITE_APP_VERSION` | Yes | Yes | Use production release tag or commit SHA. |
| `VITE_SENTRY_DSN` | Yes | Optional | Only after monitoring policy approval. |

## GitHub Actions / Supabase Deployment

These values are private and must be stored as GitHub environment secrets.

| Variable | Private | Environment | Notes |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Yes | Staging and production | Used by Supabase CLI. |
| `SUPABASE_PROJECT_REF_STAGING` | Yes | Staging | Staging project ref. |
| `SUPABASE_DB_PASSWORD_STAGING` | Yes | Staging | Staging database password. |
| `SUPABASE_PROJECT_REF_PRODUCTION` | Yes | Production | Production project ref. |
| `SUPABASE_DB_PASSWORD_PRODUCTION` | Yes | Production | Production database password. |
| `VERCEL_TOKEN` | Yes | Staging and production | Used by Vercel CLI. |
| `VERCEL_ORG_ID` | Yes | Staging and production | Vercel team/org id. |
| `VERCEL_PROJECT_ID` | Yes | Staging and production | Vercel project id. |

## Edge Function Secrets Per Supabase Project

Set these separately in development, staging, and production Supabase projects.

| Secret | Private | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Never expose to frontend or Vercel browser env. |
| `GEMINI_MODEL` | Yes | Model name for ai-chef. |
| `APP_SUPABASE_SERVICE_ROLE_KEY` | Yes | Optional fallback if built-in Edge Function service role is unavailable. |

Service role keys, database passwords, Supabase access tokens, and Gemini keys never go to Vercel frontend environment variables.
