import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(testDir, '../../supabase/migrations')
const migration = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(resolve(migrationsDir, file), 'utf8'))
  .join('\n')

describe('Supabase RLS migration', () => {
  it('enables RLS for every user data table', () => {
    const tables = [
      'profiles',
      'families',
      'family_members',
      'allergies',
      'dietary_restrictions',
      'food_preferences',
      'ingredients',
      'recipes',
      'recipe_ingredients',
      'recipe_nutrition_cache',
      'menu_plans',
      'menu_plan_items',
      'pantry_inventory',
      'freezer_inventory',
      'shopping_lists',
      'shopping_list_items',
      'alerts',
      'app_settings',
      'family_users',
      'user_ai_settings',
      'food_categories',
    ]

    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`)
    }
  })

  it('isolates family data and chef access through helper policies', () => {
    expect(migration).toContain('public.can_access_family')
    expect(migration).toContain('owner_id = auth.uid()')
    expect(migration).toContain('chef_id = auth.uid()')
    expect(migration).toContain('public.is_super_admin()')
    expect(migration).toContain('public.can_write_family')
    expect(migration).toContain('public.can_write_owned_catalog')
    expect(migration).toContain("public.current_user_role() = 'chef'")
    expect(migration).toContain("fu.role in ('chef','family_admin','viewer')")
    expect(migration).toContain('Avoid same-table helper lookups in family RLS policies')
    expect(migration).toContain('public.has_family_membership')
    expect(migration).toContain('revoke all on public.user_ai_settings from anon, authenticated')
    expect(migration).toContain('create policy food_categories_select')
  })
})
