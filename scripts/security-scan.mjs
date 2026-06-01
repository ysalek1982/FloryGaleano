import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const findings = []

const tracked = listTrackedFiles()
const trackedEnv = tracked.filter((file) => /^\.env($|\.|[\\/])/.test(file) && file !== '.env.example')
for (const file of trackedEnv) {
  findings.push(`Tracked environment file is not allowed: ${file}`)
}

const files = tracked.length ? tracked : walk(root)
for (const file of files) {
  if (!shouldScan(file)) continue
  const absolute = resolve(root, file)
  if (!existsSync(absolute)) continue
  const source = readFileSync(absolute, 'utf8')

  if (/AIza[0-9A-Za-z_-]{20,}/.test(source)) findings.push(`Possible Gemini/API key pattern in ${file}`)
  if (/sbp_[0-9a-fA-F]{24,}/.test(source)) findings.push(`Possible Supabase access token pattern in ${file}`)
  if (/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(source) && /service_role/i.test(source)) {
    findings.push(`Possible service role JWT in ${file}`)
  }
  if (/generativelanguage\.googleapis\.com[\s\S]{0,120}\?key=\$\{?apiKey/i.test(source)) {
    findings.push(`Gemini API keys must be sent via x-goog-api-key header, not URL query string: ${file}`)
  }
  const historicalRoleMetadataMigration = [
    'supabase/migrations/20260523152000_initial_schema.sql',
    'supabase/migrations/20260523170000_production_rls_seed_ai.sql',
  ].includes(file)
  if (/raw_user_meta_data\s*->>\s*['"]role['"]/.test(source) && !historicalRoleMetadataMigration) {
    findings.push(`Auth user metadata must not control profile roles: ${file}`)
  }

  const isFrontend = file.startsWith('src/') && !file.startsWith('src/test/')
  if (isFrontend && /(SUPABASE_SERVICE_ROLE_KEY|APP_SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|GEMINI_API_KEY|service_role)/.test(source)) {
    findings.push(`Frontend secret reference is not allowed in ${file}`)
  }
  if (isFrontend && /localStorage\.[\s\S]{0,120}(gemini|apiKey|api_key|ai[-_ ]?key)/i.test(source)) {
    findings.push(`Gemini/API keys must not be persisted to localStorage in ${file}`)
  }
  if (isFrontend && /\b(encrypted_key|key_iv|vault_secret_id)\b/.test(source)) {
    findings.push(`Frontend must not select or render raw AI key storage fields in ${file}`)
  }
  if (file === 'supabase/functions/ai-chef/index.ts') {
    const unsafeRecipeIngredientLoad = /from\('recipe_ingredients'\)\.select\('\*'\)(?![\s\S]{0,120}\.in\('recipe_id')/.test(source)
    if (unsafeRecipeIngredientLoad) {
      findings.push('ai-chef must filter recipe_ingredients by accessible recipe IDs')
    }
  }
}

for (const functionDir of listSupabaseFunctions()) {
  const name = functionDir.split('/').pop()
  const deployPattern = new RegExp(`functions\\s+deploy\\s+${escapeRegExp(name)}\\b`)
  const workflows = tracked
    .filter((file) => file.startsWith('.github/workflows/') && /\.ya?ml$/.test(file))
    .map((file) => readFileSync(resolve(root, file), 'utf8'))
    .join('\n')
  if (!deployPattern.test(workflows) && !/functions\s+deploy\s+--all\b/.test(workflows)) {
    findings.push(`Supabase function ${name} is not deployed by CI workflows`)
  }
}

if (findings.length) {
  console.error('Security scan failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('PASS security scan complete')

function listTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .map((file) => file.replaceAll('\\', '/'))
  } catch {
    return []
  }
}

function walk(directory) {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'playwright-report', 'test-results'])
  const output = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const absolute = join(directory, entry.name)
    const rel = relative(root, absolute).replaceAll('\\', '/')
    if (entry.isDirectory()) {
      output.push(...walk(absolute))
    } else {
      output.push(rel)
    }
  }
  return output
}

function shouldScan(file) {
  if (file === '.env.example') return true
  if (/^\.env($|\.)/.test(file)) return false
  if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|xlsx|csv)$/i.test(file)) return false
  return /\.(ts|tsx|js|jsx|mjs|json|md|yml|yaml|html|css|sql|toml)$/i.test(file)
}

function listSupabaseFunctions() {
  const base = resolve(root, 'supabase/functions')
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `supabase/functions/${entry.name}`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
