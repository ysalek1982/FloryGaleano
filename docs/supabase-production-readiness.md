# Supabase Production Readiness

Use separate Supabase projects for development, staging, and production. The production project should start empty, receive migrations from source control, and never be manually shaped from the dashboard.

## Create Staging and Production Projects

1. Create a new Supabase project for staging.
2. Create a new Supabase project for production.
3. Save project refs in CI secrets, not in source files.
4. Configure Auth redirect URLs for each deployed domain.

## Link and Push Migrations

```powershell
npx supabase link --project-ref "<project-ref>"
npx supabase db push
npx supabase migration list
```

Confirm these application tables exist and RLS is enabled before sign-off:

- profiles
- families
- family_users
- family_members
- allergies
- dietary_restrictions
- food_preferences
- ingredients
- recipes
- recipe_ingredients
- recipe_nutrition_cache
- menu_plans
- menu_plan_items
- pantry_inventory
- freezer_inventory
- shopping_lists
- shopping_list_items
- alerts
- app_settings

## Deploy ai-chef

```powershell
npx supabase secrets set GEMINI_API_KEY="$env:GEMINI_API_KEY" --project-ref "<project-ref>"
npx supabase secrets set GEMINI_MODEL="$env:GEMINI_MODEL" --project-ref "<project-ref>"
npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" --project-ref "<project-ref>"
npx supabase functions deploy ai-chef --project-ref "<project-ref>"
```

The frontend must never receive `SUPABASE_SERVICE_ROLE_KEY`, `APP_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, or `GEMINI_API_KEY`.

## Verify RLS

Run:

```powershell
npm run test:rls
npm run test:supabase
npm run smoke
```

Validate:

- Viewer cannot write.
- Family admins can access only their family.
- Chefs can access assigned families only.
- Super admins can access all expected operational data.
- Unauthenticated users cannot access private routes.

## Seed Policy

`seed_demo_workspace()` is for development and staging QA only. Do not expose seed actions in production unless the user is `super_admin` and an explicit production-safe flag is enabled. Production customer data must be created through normal UI workflows or controlled import tooling.

## Key Rotation Before Launch

- Rotate production service role key.
- Rotate production Gemini API key.
- Rotate GitHub Actions production secrets.
- Confirm production app points to production Supabase.
- Confirm old development keys are not present in Vercel production settings.
