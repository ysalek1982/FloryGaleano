# Inventory Forecast Validation

## Current Architecture

The browser uses the richer chef workflow engine in `src/features/inventory-forecast`. The `ai-chef` Supabase Edge Function includes a small server-safe inventory forecast validator with no browser dependencies.

This is option B from the implementation plan: duplicate a minimal server-safe version with remote QA. Sharing the exact frontend module with Deno is not practical yet because the frontend engine depends on application types and service imports that are bundled through Vite, while Supabase Edge Functions are deployed from the `supabase/functions` tree.

## Server-Side Validation Coverage

The Edge Function validates inventory-aware AI actions for:

- Missing ingredients for upcoming menu items.
- Pantry quantity available versus required grams.
- Purchase priority by urgency.
- Pantry items expiring soon.
- Freezer meals expiring soon.
- Freezer meals with low portions.
- Suggestion inventory status before marking output usable.

The response includes:

- `validation_summary`
- `missing_ingredients`
- `expiring_items`
- `freezer_first_candidates`
- `purchase_priority`
- `warnings`

## Consistency Guardrails

- Keep the frontend and Edge Function priority windows aligned: 1-2 days critical, 3-5 days high, 6-7 days medium.
- Keep pantry/freezer expiration windows aligned: pantry 7 days, freezer 10 days.
- Remote QA verifies that `ai-chef` returns the backend-native inventory validation fields.
- Future refactor target: move the pure calculation core into a package that can be imported by both Vite and Supabase Edge Functions.
