import { demoData } from './demoData'
import { isProductionApp } from './env'
import { supabase } from './supabase'
import type {
  Alert,
  Allergy,
  AppData,
  AppSettings,
  DietaryRestriction,
  Family,
  FamilyMember,
  FoodPreference,
  FoodCategory,
  FreezerInventory,
  Ingredient,
  MenuPlan,
  MenuPlanItem,
  PantryInventory,
  Profile,
  Recipe,
  RecipeIngredient,
  ShoppingList,
  ShoppingListItem,
} from './types'

type TableName =
  | 'families'
  | 'family_members'
  | 'allergies'
  | 'dietary_restrictions'
  | 'food_preferences'
  | 'ingredients'
  | 'recipes'
  | 'recipe_ingredients'
  | 'menu_plans'
  | 'menu_plan_items'
  | 'pantry_inventory'
  | 'freezer_inventory'
  | 'shopping_lists'
  | 'shopping_list_items'
  | 'alerts'
  | 'app_settings'

let persistenceQueue: Promise<void> = Promise.resolve()

const transientErrorPattern = /failed to fetch|network|timeout|timed out|429|5\d\d|temporarily unavailable/i

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfileRecord(profile: Profile) {
  if (!supabase) return
  const payload = {
    full_name: profile.full_name,
    email: profile.email,
    preferred_language: profile.preferred_language,
    avatar_url: profile.avatar_url,
  }
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', profile.id)
  if (error && isTransientPersistenceError(error)) {
    await delay(250)
    const retry = await supabase.from('profiles').update(payload).eq('id', profile.id)
    if (retry.error) throw retry.error
    return
  }
  if (error) throw error
}

export async function fetchSupabaseAppData(profile: Profile): Promise<AppData> {
  if (!supabase) return demoData

  let families = await selectAll<Family>('families')
  if (families.length === 0 && !isProductionApp) {
    await supabase.rpc('seed_demo_workspace')
    families = await selectAll<Family>('families')
  }

  const [
    familyMembers,
    allergies,
    dietaryRestrictions,
    foodPreferences,
    foodCategories,
    ingredients,
    recipes,
    recipeIngredients,
    menuPlans,
    menuPlanItems,
    pantryInventory,
    freezerInventory,
    shoppingLists,
    shoppingListItems,
    alerts,
    settings,
  ] = await Promise.all([
    selectAll<FamilyMember>('family_members'),
    selectAll<Allergy>('allergies'),
    selectAll<DietaryRestriction>('dietary_restrictions'),
    selectAll<FoodPreference>('food_preferences'),
    selectAll<FoodCategory>('food_categories', 'sort_order'),
    selectAll<Ingredient>('ingredients'),
    selectAll<Recipe>('recipes'),
    selectAll<RecipeIngredient>('recipe_ingredients'),
    selectAll<MenuPlan>('menu_plans'),
    selectAll<MenuPlanItem>('menu_plan_items'),
    selectAll<PantryInventory>('pantry_inventory'),
    selectAll<FreezerInventory>('freezer_inventory'),
    selectAll<ShoppingList>('shopping_lists'),
    selectAll<ShoppingListItem>('shopping_list_items'),
    selectAll<Record<string, unknown>>('alerts'),
    getOrCreateSettings(profile),
  ])

  return {
    ...demoData,
    profiles: [profile],
    families,
    familyMembers,
    allergies,
    dietaryRestrictions,
    foodPreferences,
    foodCategories,
    ingredients,
    recipes,
    recipeIngredients,
    menuPlans,
    menuPlanItems,
    pantryInventory,
    freezerInventory,
    shoppingLists,
    shoppingListItems,
    alerts: alerts.map(mapAlertRow),
    settings,
  }
}

async function selectAll<T>(table: string, orderColumn = 'created_at'): Promise<T[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: true })
  if (error) throw error
  return (data ?? []) as T[]
}

async function getOrCreateSettings(profile: Profile): Promise<AppSettings> {
  if (!supabase) return demoData.settings
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('owner_id', profile.id)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data) return data as AppSettings

  const payload = {
    owner_id: profile.id,
    gemini_enabled: false,
    ai_model: 'gemini-2.5-flash',
    default_variety_days: 21,
    default_units: 'metric',
    default_language: profile.preferred_language || 'en',
  }
  const { data: inserted, error: insertError } = await supabase
    .from('app_settings')
    .insert(payload)
    .select('*')
    .single()
  if (insertError) throw insertError
  return inserted as AppSettings
}

function mapAlertRow(row: Record<string, unknown>): Alert {
  return {
    id: String(row.id),
    family_id: String(row.family_id),
    family_member_id: row.family_member_id ? String(row.family_member_id) : undefined,
    type: String(row.type ?? 'info'),
    severity: (row.severity as Alert['severity']) ?? 'info',
    title_key: String(row.title ?? 'alerts.title'),
    message_key: String(row.message ?? 'alerts.subtitle'),
    related_table: row.related_table ? String(row.related_table) : undefined,
    related_id: row.related_id ? String(row.related_id) : undefined,
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at),
  }
}

function changedRows<T extends { id: string }>(previous: T[], next: T[]) {
  const previousById = new Map(previous.map((row) => [row.id, JSON.stringify(row)]))
  return next.filter((row) => previousById.get(row.id) !== JSON.stringify(row))
}

export function persistAppDataDiff(previous: AppData, next: AppData) {
  if (!supabase) return Promise.resolve()

  const changes = {
    families: changedRows(previous.families, next.families).map(toFamilyDb),
    familyMembers: changedRows(previous.familyMembers, next.familyMembers).map(toFamilyMemberDb),
    allergies: changedRows(previous.allergies, next.allergies).map(toAllergyDb),
    dietaryRestrictions: changedRows(previous.dietaryRestrictions, next.dietaryRestrictions),
    foodPreferences: changedRows(previous.foodPreferences, next.foodPreferences),
    ingredients: changedRows(previous.ingredients, next.ingredients).map(toIngredientDb),
    recipes: changedRows(previous.recipes, next.recipes).map(toRecipeDb),
    recipeIngredients: changedRows(previous.recipeIngredients, next.recipeIngredients).map(toRecipeIngredientDb),
    menuPlans: changedRows(previous.menuPlans, next.menuPlans),
    menuPlanItems: changedRows(previous.menuPlanItems, next.menuPlanItems).map(toMenuPlanItemDb),
    pantryInventory: changedRows(previous.pantryInventory, next.pantryInventory),
    freezerInventory: changedRows(previous.freezerInventory, next.freezerInventory),
    shoppingLists: changedRows(previous.shoppingLists, next.shoppingLists),
    shoppingListItems: changedRows(previous.shoppingListItems, next.shoppingListItems),
    alerts: changedRows(previous.alerts, next.alerts).map(toAlertDb),
    settings: changedRows([previous.settings], [next.settings]).map(toSettingsDb),
  }

  const changedTables = Object.entries(changes)
    .filter(([, rows]) => rows.length > 0)
    .map(([table, rows]) => `${table}:${rows.length}`)

  const persist = async () => {
    await upsertChanged('families', changes.families, changedTables)
    await Promise.all([
      upsertChanged('family_members', changes.familyMembers, changedTables),
      upsertChanged('ingredients', changes.ingredients, changedTables),
      upsertChanged('recipes', changes.recipes, changedTables),
      upsertChanged('menu_plans', changes.menuPlans, changedTables),
      upsertChanged('app_settings', changes.settings, changedTables),
    ])
    await Promise.all([
      upsertChanged('allergies', changes.allergies, changedTables),
      upsertChanged('dietary_restrictions', changes.dietaryRestrictions, changedTables),
      upsertChanged('food_preferences', changes.foodPreferences, changedTables),
      upsertChanged('recipe_ingredients', changes.recipeIngredients, changedTables),
      upsertChanged('menu_plan_items', changes.menuPlanItems, changedTables),
      upsertChanged('pantry_inventory', changes.pantryInventory, changedTables),
      upsertChanged('freezer_inventory', changes.freezerInventory, changedTables),
      upsertChanged('shopping_lists', changes.shoppingLists, changedTables),
      upsertChanged('alerts', changes.alerts, changedTables),
    ])
    await upsertChanged('shopping_list_items', changes.shoppingListItems, changedTables)
  }

  persistenceQueue = persistenceQueue.catch(() => undefined).then(persist)
  return persistenceQueue
}

async function upsertChanged(table: TableName, rows: object[], changedTables: string[], attempt = 1): Promise<void> {
  if (!supabase || rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows)
  if (!error) return
  if (attempt === 1 && isTransientPersistenceError(error)) {
    await delay(250)
    return upsertChanged(table, rows, changedTables, 2)
  }
  const details = { table, rowCount: rows.length, attempt, changedTables, code: error.code, message: error.message }
  console.error('Supabase persistence table failed', details)
  throw error
}

function isTransientPersistenceError(error: { code?: string; message?: string; details?: string }) {
  return transientErrorPattern.test(`${error.code || ''} ${error.message || ''} ${error.details || ''}`)
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

function toFamilyDb(row: Family) {
  return row
}

function toFamilyMemberDb(row: FamilyMember) {
  return row
}

function toAllergyDb(row: Allergy) {
  return row
}

function toIngredientDb(row: Ingredient) {
  return {
    ...row,
    scope: row.scope ?? (row.family_id ? 'family' : 'owner'),
  }
}

function toRecipeDb(row: Recipe) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    family_id: row.family_id,
    scope: row.scope ?? (row.family_id ? 'family' : 'owner'),
    name: row.name,
    description: row.description,
    category: row.category,
    cuisine_type: row.cuisine_type,
    main_protein: row.main_protein,
    meal_style: row.meal_style,
    prep_time_minutes: row.prep_time_minutes,
    cook_time_minutes: row.cook_time_minutes,
    servings: row.servings,
    serving_size_g: row.serving_size_g,
    instructions: row.instructions,
    reheating_instructions: row.reheating_instructions,
    chef_notes: row.chef_notes,
    is_freezer_friendly: row.is_freezer_friendly,
    is_school_friendly: row.is_school_friendly,
    is_gluten_free: row.is_gluten_free,
    visible_melted_cheese: row.visible_melted_cheese,
    status: row.status,
    image_url: row.image_url,
    ai_generated: row.ai_generated ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toRecipeIngredientDb(row: RecipeIngredient) {
  return row
}

function toAlertDb(row: Alert) {
  return {
    id: row.id,
    family_id: row.family_id,
    family_member_id: row.family_member_id,
    type: row.type,
    severity: row.severity,
    title: row.title_key,
    message: row.message_key,
    related_table: row.related_table,
    related_id: row.related_id,
    is_read: row.is_read,
    created_at: row.created_at,
  }
}

function toMenuPlanItemDb(row: MenuPlanItem) {
  return row
}

function toSettingsDb(row: AppSettings) {
  return row
}
