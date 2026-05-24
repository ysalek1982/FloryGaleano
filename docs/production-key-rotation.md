# Production Key Rotation

Use this checklist before the first production launch and after any suspected secret exposure.

## Supabase

- Rotate the production publishable or anon key if it was shared outside the intended environment.
- Rotate the production service role key.
- Update Supabase Edge Function fallback secret `APP_SUPABASE_SERVICE_ROLE_KEY` if used.
- Update GitHub Actions production secrets.
- Update hosting provider environment variables.
- Redeploy ai-chef after secret changes.

## Gemini

- Rotate the production Gemini API key.
- Set the new key with `npx supabase secrets set GEMINI_API_KEY=...`.
- Confirm `GEMINI_MODEL` is set.
- Run ai-chef smoke tests.

## GitHub Actions and Hosting

- Rotate `VERCEL_TOKEN`.
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match the production project.
- Rotate any Sentry or monitoring tokens.
- Confirm `.env.local` is ignored and not tracked.

## Verification

- Production frontend points to production Supabase.
- Production Edge Function has production Gemini secrets.
- Development keys are absent from production Vercel settings.
- No secrets appear in browser source, network responses, logs, or export files.
- `npm run security:scan` passes before deployment.
