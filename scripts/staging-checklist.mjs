const sections = [
  {
    title: 'Required staging frontend variables',
    items: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_APP_ENV=staging',
      'VITE_APP_VERSION',
      'VITE_SENTRY_DSN (optional)',
    ],
  },
  {
    title: 'Required GitHub staging secrets',
    items: [
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_PROJECT_REF_STAGING',
      'SUPABASE_DB_PASSWORD_STAGING',
      'STAGING_URL',
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      'STAGING_GEMINI_API_KEY',
      'STAGING_GEMINI_MODEL',
      'STAGING_APP_SUPABASE_SERVICE_ROLE_KEY (optional fallback)',
      'STAGING_APP_USER_SECRET_ENCRYPTION_KEY',
    ],
  },
  {
    title: 'Required Vercel Preview variables',
    items: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_APP_ENV=staging',
      'VITE_APP_VERSION',
      'VITE_SENTRY_DSN (optional)',
    ],
  },
  {
    title: 'Required Supabase Edge Function secrets',
    items: [
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'APP_SUPABASE_SERVICE_ROLE_KEY (only if built-in service role is unavailable)',
      'APP_USER_SECRET_ENCRYPTION_KEY',
    ],
  },
]

console.log('Smart Family Meals staging execution checklist')
console.log('Presence reflects the current process environment only; missing is expected until staging values are exported or configured in GitHub/Vercel.')
for (const section of sections) {
  console.log(`\n${section.title}`)
  for (const item of section.items) console.log(`- ${item}: ${present(item.split(/[ =]/)[0])}`)
}

console.log('\nCommands')
console.log('npx supabase link --project-ref <STAGING_PROJECT_REF>')
console.log('npx supabase db push')
console.log('npx supabase migration list')
console.log('npx supabase secrets set GEMINI_API_KEY="<STAGING_GEMINI_API_KEY>"')
console.log('npx supabase secrets set GEMINI_MODEL="gemini-2.5-flash"')
console.log('npx supabase secrets set APP_SUPABASE_SERVICE_ROLE_KEY="<STAGING_SERVICE_ROLE_KEY>"')
console.log('npx supabase secrets set APP_USER_SECRET_ENCRYPTION_KEY="<STAGING_USER_SECRET_ENCRYPTION_KEY>"')
console.log('npx supabase functions deploy ai-chef')
console.log('npx supabase functions deploy ai-key-manager')
console.log('npm run validate:env -- --mode staging --strict')
console.log('npm run smoke:staging')

console.log('\nWarnings')
console.log('- Never paste real secrets into committed files or documentation.')
console.log('- Do not point staging Vercel Preview at production Supabase.')
console.log('- Do not point production deployment at staging Supabase.')
console.log('- Do not set service role or Gemini keys as Vercel frontend variables.')
console.log('- Run remote QA sequentially; do not run staging and production mutations in parallel.')

function present(name) {
  return process.env[name] ? 'present' : 'missing'
}
