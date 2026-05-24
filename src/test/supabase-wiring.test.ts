import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(testDir, '../..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Supabase production wiring', () => {
  it('uses publishable frontend credentials and never service role in browser client', () => {
    const source = read('src/lib/supabase.ts')
    expect(source).toContain('VITE_SUPABASE_URL')
    expect(source).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(source).toContain('VITE_SUPABASE_ANON_KEY')
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('keeps .env.example placeholder-only for private credentials', () => {
    const envExample = read('.env.example')
    expect(envExample).toContain('SUPABASE_PROJECT_REF=<your-project-ref>')
    expect(envExample).toContain('VITE_SUPABASE_URL=https://your-project.supabase.co')
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>')
    expect(envExample).toContain('GEMINI_API_KEY=<your-gemini-api-key>')
    expect(envExample).not.toContain('eyJhbGci')
    expect(envExample).not.toContain('AIza')
    expect(envExample).not.toContain('sbp_')
  })

  it('guards auth redirects and persists app CRUD through Supabase upserts', () => {
    const router = read('src/app/AppRouter.tsx')
    const protectedRoute = read('src/app/ProtectedRoute.tsx')
    const database = read('src/lib/database.ts')
    expect(protectedRoute).toContain('<Navigate to="/login" replace />')
    expect(router).toContain('<Navigate to="/app/dashboard" replace />')
    expect(router).toContain('lazy(() => import')
    expect(database).toContain('persistAppDataDiff')
    expect(database).toContain("'ingredients'")
    expect(database).toContain("'recipes'")
    expect(database).toContain('upsertChanged')
  })

  it('defines secure ai-chef Edge Function with supported actions', () => {
    const edgeFunction = read('supabase/functions/ai-chef/index.ts')
    expect(edgeFunction).toContain("Deno.env.get('GEMINI_API_KEY')")
    expect(edgeFunction).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(edgeFunction).toContain("Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')")
    expect(edgeFunction).toContain('generate_week_menu')
    expect(edgeFunction).toContain('suggest_substitutions')
    expect(edgeFunction).toContain('optimize_freezer_usage')
    expect(edgeFunction).toContain('validateAiOutput')
    expect(edgeFunction).not.toContain('eyJhbGci')
    expect(edgeFunction).not.toContain('AIza')
  })
})
