import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
loadEnv(resolve(root, '.env.local'))
loadEnv(resolve(root, '.env'))

const mode = readArg('--mode') || 'default'
const strict = process.argv.includes('--strict')

const frontendRequired = [
  ['VITE_SUPABASE_URL'],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'],
]

const optional = [
  'VITE_APP_ENV',
  'VITE_APP_VERSION',
  'VITE_SENTRY_DSN',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_PROJECT_REF_STAGING',
  'SUPABASE_DB_PASSWORD_STAGING',
  'SUPABASE_PROJECT_REF_PRODUCTION',
  'SUPABASE_DB_PASSWORD_PRODUCTION',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_SUPABASE_SERVICE_ROLE_KEY',
  'APP_USER_SECRET_ENCRYPTION_KEY',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'SENTRY_AUTH_TOKEN',
  'STAGING_URL',
  'PRODUCTION_URL',
]

let failed = false
let warnings = 0

console.log(`Environment validation (${mode})`)
validateFrontendRequired(mode === 'default')
validateMode()
for (const name of optional) {
  status(process.env[name] ? 'INFO' : 'WARN', `optional ${name}`, process.env[name] ? 'present' : 'missing')
}

if (failed) {
  console.error('Missing or invalid required environment variables.')
  process.exit(1)
}

console.log(`PASS environment validation complete${warnings ? ` with ${warnings} warning(s)` : ''}`)

function validateFrontendRequired(failWhenMissing) {
  for (const group of frontendRequired) {
    const present = group.some((name) => Boolean(process.env[name]))
    const label = group.join(' or ')
    if (present) {
      status('PASS', `required ${label}`, 'present')
    } else if (failWhenMissing || strict) {
      status('FAIL', `required ${label}`, 'missing')
      failed = true
    } else {
      status('WARN', `required ${label}`, 'missing for this local environment')
    }
  }
}

function validateMode() {
  if (mode === 'default') return
  if (!['staging', 'production'].includes(mode)) {
    status('FAIL', 'mode', `unsupported mode "${mode}"`)
    failed = true
    return
  }

  const expectedEnv = mode
  const actualEnv = process.env.VITE_APP_ENV || ''
  if (actualEnv === expectedEnv) {
    status('PASS', 'required VITE_APP_ENV', expectedEnv)
  } else if (strict) {
    status('FAIL', 'required VITE_APP_ENV', `must be ${expectedEnv}`)
    failed = true
  } else {
    status('WARN', 'required VITE_APP_ENV', `not set to ${expectedEnv} in this local shell`)
  }

  if (mode === 'production') validateProductionSafety()
  if (['staging', 'production'].includes(mode)) validateEdgeSecrets()
}

function validateProductionSafety() {
  const url = process.env.VITE_SUPABASE_URL || ''
  const urlLooksLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url)
  const urlLooksPlaceholder = /example|your-project/i.test(url)
  const appEnvLooksDev = /dev|development|local/i.test(process.env.VITE_APP_ENV || '')

  if (urlLooksLocal) status('WARN', 'production Supabase URL', 'appears to be localhost')
  if (urlLooksPlaceholder) status('WARN', 'production Supabase URL', 'appears to be a placeholder')
  if (appEnvLooksDev) status('WARN', 'production app environment', 'appears to be a development value')
}

function validateEdgeSecrets() {
  const requiredForEdge = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD', 'APP_USER_SECRET_ENCRYPTION_KEY']
  for (const name of requiredForEdge) {
    if (process.env[name]) {
      status('PASS', `edge ${name}`, 'present')
    } else if (strict) {
      status('FAIL', `edge ${name}`, 'missing')
      failed = true
    } else {
      status('WARN', `edge ${name}`, 'missing for Edge Function deployment')
    }
  }
}

function status(level, label, detail) {
  if (level === 'WARN') warnings += 1
  console.log(`${level} ${label}: ${detail}`)
}

function readArg(name) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function loadEnv(path) {
  if (!existsSync(path)) return
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}
