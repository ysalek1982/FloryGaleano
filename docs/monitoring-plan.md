# Monitoring Plan

Smart Family Meals now includes lightweight monitoring hooks that do not require a monitoring vendor in local development.

## Recommended Service

Sentry is the recommended first monitoring provider for the React frontend because it supports release tracking, source maps, error grouping, and user-facing stability monitoring.

## Runtime Variables

- `VITE_SENTRY_DSN` enables frontend error capture when a browser Sentry SDK is available.
- `VITE_APP_ENV` identifies `development`, `staging`, `preview`, or `production`.
- `VITE_APP_VERSION` identifies the release, usually a commit SHA or tag.
- `SENTRY_AUTH_TOKEN` is optional and should be used only in CI for future source map uploads.

## Current Implementation

- `src/lib/monitoring.ts` initializes monitoring only when `VITE_SENTRY_DSN` exists.
- `ErrorBoundary` catches React route/app failures and shows a translated friendly fallback.
- Errors are captured through a global `window.Sentry` bridge if Sentry is added by the host or future app integration.
- Local development logs handled errors to the console; production does not show raw stack traces to users.

## Future Source Map Upload

Do not upload source maps until `SENTRY_AUTH_TOKEN`, organization, and project settings are configured in CI. Keep source map uploads gated so missing Sentry credentials never break normal builds.

## Sentry SDK Decision Gate

Add the full Sentry SDK only when all of these are true:

- A Sentry project exists for staging and production.
- `VITE_SENTRY_DSN` is available for each frontend environment.
- `SENTRY_AUTH_TOKEN` is configured in CI.
- Source-map upload policy is approved.
- Privacy and logging policy are reviewed.

Implementation requirements when approved:

- Initialize Sentry only when `VITE_SENTRY_DSN` exists.
- Keep local development working when DSN is absent.
- Upload source maps only in production CI.
- Do not capture secrets, tokens, full request payloads, or sensitive family data.

## Operational Alerts

Production monitoring should track:

- Frontend route crashes.
- Supabase auth failures.
- ai-chef Edge Function errors.
- Export failures.
- Unexpected RLS denials in normal user flows.
- Slow initial route load and slow report generation.
