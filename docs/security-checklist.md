# Security Checklist

## Frontend

- Frontend Supabase access uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
- No frontend code imports or reads `SUPABASE_SERVICE_ROLE_KEY`, `APP_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, or `GEMINI_API_KEY`.
- Gemini calls are routed only through the `ai-chef` Supabase Edge Function.
- User Gemini keys are managed only through the `ai-key-manager` Supabase Edge Function.
- The browser never receives `encrypted_key`, `key_iv`, `vault_secret_id`, or decrypted Gemini key material.
- Exports include operational report data only and must not include tokens, API keys, passwords, or service-role values.
- Viewer role controls remain hidden or disabled in the UI, with Supabase RLS as the final authority.

## Repository

- `.env.local`, `.env`, `.env.production`, and other real environment files are ignored.
- `.env.example` contains placeholders only.
- `npm run security:scan` checks for tracked env files, frontend secret references, and common token/key patterns.
- Do not commit generated Playwright reports or test downloads.

## Supabase

- RLS is enabled on all application data tables.
- Remote QA verifies role isolation and viewer read-only behavior.
- Edge Functions read secrets from Supabase-managed environment variables.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by backend scripts, CLI tooling, or Edge Functions.
- If a custom Edge Function service role secret is needed, use `APP_SUPABASE_SERVICE_ROLE_KEY`.
- `APP_USER_SECRET_ENCRYPTION_KEY` is required for AES-GCM user-key storage and must exist only as an Edge Function secret.

## AI Safety

- AI suggestions must be structured JSON.
- AI suggestions are validated before use by allergy, nutrition, rotation, and inventory checks.
- Unsafe suggestions are blocked or marked `review_needed`.
- Provider failures return structured `review_needed` fallbacks instead of exposing raw errors.
- Missing user Gemini keys return setup-needed `review_needed` responses instead of failing the user workflow.

## Launch Readiness

- Rotate development keys before production launch.
- Replace or disable development QA users before production launch.
- Confirm production Supabase project has the same RLS policies and Edge Function secrets.
- Confirm logs and monitoring do not capture secret values.
- Confirm demo seed actions are hidden or disabled in production unless explicitly enabled for `super_admin`.
- Confirm QA/debug panels are hidden from normal production users.
- Confirm user-facing failures use translated friendly messages, not raw stack traces.
