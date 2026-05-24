# Final Launch Checklist

Use this document as a launch sign-off artifact.

## Product

- [ ] Landing page
- [ ] Login/register/password reset
- [ ] Families
- [ ] Diners
- [ ] Ingredients
- [ ] Recipes with images
- [ ] Menu Planner
- [ ] Day Planner
- [ ] Portion Calculator
- [ ] Pantry
- [ ] Freezer
- [ ] Shopping List
- [ ] Alerts
- [ ] Reports and exports
- [ ] AI Chef
- [ ] Settings and health panel

## Security

- [ ] RLS enabled on all application tables
- [ ] No service role key in frontend
- [ ] No Gemini key in frontend
- [ ] Production secrets configured
- [ ] Viewer role remains read-only
- [ ] AI suggestions validated before apply
- [ ] Exports do not include secrets or private tokens

## Data

- [ ] Migrations applied to production
- [ ] No demo data in production
- [ ] Backups reviewed
- [ ] Demo seed action disabled or protected
- [ ] Auth redirect URLs configured
- [ ] No demo seed runs automatically in production
- [ ] Demo login hidden in production
- [ ] Staging data not copied blindly to production
- [ ] Production Supabase backups configured according to the chosen plan
- [ ] RLS smoke tests executed against production
- [ ] Viewer write attempts fail against production
- [ ] AI suggestions cannot bypass safety validation
- [ ] Export files do not include internal tokens or secrets
- [ ] Key rotation completed before first real user

## QA

- [ ] `npm run validate:env`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:rls`
- [ ] `npm run test:supabase`
- [ ] `npm run smoke`
- [ ] `npm run test:e2e`
- [ ] `npm audit --omit=dev`
- [ ] `npm run security:scan`

## Deployment

- [ ] Vercel project configured
- [ ] Production Supabase project configured
- [ ] ai-chef deployed
- [ ] Frontend env vars set
- [ ] Edge Function secrets set
- [ ] Custom domain active
- [ ] Monitoring configured or explicitly deferred

## Post-Launch

- [ ] Run smoke test on production URL
- [ ] Confirm Settings health panel
- [ ] Review error monitoring
- [ ] Confirm rollback path
- [ ] Confirm support contact and escalation owner
