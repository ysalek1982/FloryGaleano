/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import i18n from '../i18n/config'
import {
  fetchProfile,
  fetchSupabaseAppData,
  persistAppDataDiff,
  updateProfileRecord,
} from './database'
import { demoData, ids } from './demoData'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  Allergy,
  AppData,
  AppSettings,
  DietaryRestriction,
  Family,
  FamilyMember,
  FoodPreference,
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
import { normalizeName, uid } from './utils'

const DATA_KEY = 'smart-family-meals:data'
const AUTH_KEY = 'smart-family-meals:profile'

interface AuthContextValue {
  profile: Profile | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  demoLogin: () => void
  logout: () => Promise<void>
  updateProfile: (profile: Profile) => void
}

interface AppDataContextValue {
  data: AppData
  isDataLoading: boolean
  setData: (updater: (current: AppData) => AppData) => void
  addFamily: (family: Partial<Family>) => Family
  updateFamily: (familyId: string, family: Partial<Family>) => void
  addDiner: (diner: Partial<FamilyMember>) => FamilyMember
  updateDiner: (dinerId: string, diner: Partial<FamilyMember>) => void
  addIngredient: (ingredient: Partial<Ingredient>) => Ingredient
  updateIngredient: (ingredientId: string, ingredient: Partial<Ingredient>) => void
  addRecipe: (recipe: Partial<Recipe>, ingredients: Array<Partial<RecipeIngredient>>) => Recipe
  updateRecipe: (recipeId: string, recipe: Partial<Recipe>, ingredients?: Array<Partial<RecipeIngredient>>) => void
  addAllergy: (allergy: Partial<Allergy>) => Allergy
  updateAllergy: (allergyId: string, allergy: Partial<Allergy>) => void
  addDietaryRestriction: (restriction: Partial<DietaryRestriction>) => DietaryRestriction
  addFoodPreference: (preference: Partial<FoodPreference>) => FoodPreference
  addMenuPlan: (plan: Partial<MenuPlan>) => MenuPlan
  addMenuPlanItem: (item: Partial<MenuPlanItem>) => MenuPlanItem
  removeMenuPlanItem: (itemId: string) => void
  addPantryItem: (item: Partial<PantryInventory>) => PantryInventory
  updatePantryItem: (itemId: string, item: Partial<PantryInventory>) => void
  addFreezerItem: (item: Partial<FreezerInventory>) => FreezerInventory
  updateFreezerItem: (itemId: string, item: Partial<FreezerInventory>) => void
  addShoppingList: (list: Partial<ShoppingList>) => ShoppingList
  addShoppingListItem: (item: Partial<ShoppingListItem>) => ShoppingListItem
  updateShoppingListItem: (itemId: string, item: Partial<ShoppingListItem>) => void
  markAlertRead: (alertId: string) => void
  markAllAlertsRead: (alertIds?: string[]) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  toggleShoppingItem: (itemId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AppDataContext = createContext<AppDataContextValue | null>(null)

function readStoredData(): AppData {
  const stored = localStorage.getItem(DATA_KEY)
  if (!stored) return demoData
  try {
    return JSON.parse(stored) as AppData
  } catch {
    return demoData
  }
}

function readStoredProfile(): Profile | null {
  const stored = localStorage.getItem(AUTH_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as Profile
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => (isSupabaseConfigured ? null : readStoredProfile()))
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const client = supabase

    const syncSession = async () => {
      setIsAuthLoading(true)
      const { data } = await client.auth.getSession()
      if (!data.session?.user) {
        setProfile(null)
        localStorage.removeItem(AUTH_KEY)
        setIsAuthLoading(false)
        return
      }
      const dbProfile = await fetchProfile(data.session.user.id)
      const nextProfile: Profile = dbProfile ?? {
        ...demoData.profiles[0],
        id: data.session.user.id,
        email: data.session.user.email ?? '',
        full_name: data.session.user.user_metadata.full_name ?? data.session.user.email ?? '',
      }
      setProfile(nextProfile)
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextProfile))
      localStorage.setItem('smart-family-meals:language', nextProfile.preferred_language)
      i18n.changeLanguage(nextProfile.preferred_language)
      setIsAuthLoading(false)
    }

    void syncSession()
    const { data: subscription } = client.auth.onAuthStateChange(() => {
      void syncSession()
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const updateProfile = (nextProfile: Profile) => {
    setProfile(nextProfile)
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextProfile))
    localStorage.setItem('smart-family-meals:language', nextProfile.preferred_language)
    i18n.changeLanguage(nextProfile.preferred_language)
    if (isSupabaseConfigured) {
      void updateProfileRecord(nextProfile).catch((error) => {
        console.error('Profile update failed', error)
      })
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthenticated: Boolean(profile),
      isAuthLoading,
      async login(email, password) {
        if (isSupabaseConfigured && supabase) {
          const { error, data } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          const dbProfile = await fetchProfile(data.user.id)
          const nextProfile: Profile = dbProfile ?? {
            ...demoData.profiles[0],
            id: data.user.id,
            email: data.user.email ?? email,
            full_name: data.user.user_metadata.full_name ?? email,
          }
          updateProfile(nextProfile)
          return
        }
        updateProfile({ ...demoData.profiles[0], email })
      },
      async register(fullName, email, password) {
        if (isSupabaseConfigured && supabase) {
          const { error, data } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, preferred_language: i18n.language.startsWith('es') ? 'es' : 'en' } },
          })
          if (error) throw error
          if (data.user) {
            updateProfile({ ...demoData.profiles[0], id: data.user.id, full_name: fullName, email })
          }
          return
        }
        updateProfile({ ...demoData.profiles[0], full_name: fullName, email })
      },
      async forgotPassword(email) {
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(email)
          if (error) throw error
        }
      },
      demoLogin() {
        updateProfile(demoData.profiles[0])
      },
      async logout() {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut()
        }
        setProfile(null)
        localStorage.removeItem(AUTH_KEY)
      },
      updateProfile,
    }),
    [isAuthLoading, profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => readStoredData())
  const { profile, isAuthenticated } = useAuth()
  const [hydratedProfileId, setHydratedProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem(DATA_KEY, JSON.stringify(data))
    }
  }, [data])

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !profile) return
    let cancelled = false
    fetchSupabaseAppData(profile)
      .then((nextData) => {
        if (cancelled) return
        setDataState(nextData)
        setHydratedProfileId(profile.id)
      })
      .catch((error) => {
        console.error('Supabase data load failed', error)
        setHydratedProfileId(profile.id)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, profile])

  const setData = useCallback((updater: (current: AppData) => AppData) => {
    setDataState((current) => {
      const next = updater(current)
      if (isSupabaseConfigured && hydratedProfileId === profile?.id) {
        persistAppDataDiff(current, next)
      }
      return next
    })
  }, [hydratedProfileId, profile?.id])

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      isDataLoading: isSupabaseConfigured && isAuthenticated && Boolean(profile) && hydratedProfileId !== profile?.id,
      setData,
      addFamily(input) {
        const family: Family = {
          id: uid('family'),
          name: input.name || 'New Family',
          description: input.description || '',
          primary_contact_name: input.primary_contact_name || '',
          primary_contact_email: input.primary_contact_email || '',
          primary_contact_phone: input.primary_contact_phone || '',
          address: input.address || '',
          notes: input.notes || '',
          owner_id: input.owner_id || profile?.id || ids.chef,
          chef_id: input.chef_id || profile?.id || ids.chef,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, families: [family, ...current.families] }))
        return family
      },
      updateFamily(familyId, input) {
        setData((current) => ({
          ...current,
          families: current.families.map((family) =>
            family.id === familyId ? { ...family, ...input, updated_at: new Date().toISOString() } : family,
          ),
        }))
      },
      addDiner(input) {
        const diner: FamilyMember = {
          id: uid('diner'),
          family_id: input.family_id || data.families[0]?.id || ids.family,
          full_name: input.full_name || 'New Diner',
          nickname: input.nickname || '',
          age_years: Number(input.age_years ?? 0),
          activity_level: input.activity_level || 'moderate',
          portion_factor: Number(input.portion_factor ?? 1),
          daily_calorie_target: Number(input.daily_calorie_target ?? 1800),
          daily_protein_target_g: Number(input.daily_protein_target_g ?? 60),
          notes: input.notes || '',
          is_active: input.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, familyMembers: [diner, ...current.familyMembers] }))
        return diner
      },
      updateDiner(dinerId, input) {
        setData((current) => ({
          ...current,
          familyMembers: current.familyMembers.map((diner) =>
            diner.id === dinerId
              ? {
                  ...diner,
                  ...input,
                  age_years: input.age_years == null ? diner.age_years : Number(input.age_years),
                  portion_factor: input.portion_factor == null ? diner.portion_factor : Number(input.portion_factor),
                  daily_calorie_target: input.daily_calorie_target == null ? diner.daily_calorie_target : Number(input.daily_calorie_target),
                  daily_protein_target_g: input.daily_protein_target_g == null ? diner.daily_protein_target_g : Number(input.daily_protein_target_g),
                  updated_at: new Date().toISOString(),
                }
              : diner,
          ),
        }))
      },
      addIngredient(input) {
        const ingredient: Ingredient = {
          id: uid('ingredient'),
          owner_id: input.owner_id || profile?.id || ids.chef,
          family_id: input.family_id || data.families[0]?.id,
          scope: input.scope || (input.family_id || data.families[0]?.id ? 'family' : 'owner'),
          name: input.name || 'New Ingredient',
          normalized_name: normalizeName(input.name || 'New Ingredient'),
          category: input.category || '',
          default_unit: input.default_unit || 'g',
          calories_per_100g: Number(input.calories_per_100g ?? 0),
          protein_g_per_100g: Number(input.protein_g_per_100g ?? 0),
          carbs_g_per_100g: Number(input.carbs_g_per_100g ?? 0),
          fat_g_per_100g: Number(input.fat_g_per_100g ?? 0),
          fiber_g_per_100g: Number(input.fiber_g_per_100g ?? 0),
          sugar_g_per_100g: Number(input.sugar_g_per_100g ?? 0),
          sodium_mg_per_100g: Number(input.sodium_mg_per_100g ?? 0),
          calcium_mg_per_100g: Number(input.calcium_mg_per_100g ?? 0),
          iron_mg_per_100g: Number(input.iron_mg_per_100g ?? 0),
          contains_gluten: input.contains_gluten ?? false,
          contains_dairy: input.contains_dairy ?? false,
          contains_egg: input.contains_egg ?? false,
          contains_fish: input.contains_fish ?? false,
          contains_shellfish: input.contains_shellfish ?? false,
          contains_tree_nuts: input.contains_tree_nuts ?? false,
          contains_peanuts: input.contains_peanuts ?? false,
          contains_sesame: input.contains_sesame ?? false,
          contains_soy: input.contains_soy ?? false,
          allergen_tags: input.allergen_tags ?? [],
          may_contain_tags: input.may_contain_tags ?? [],
          allowed_exceptions: input.allowed_exceptions ?? [],
          blocked_derivatives: input.blocked_derivatives ?? [],
          source: input.source || 'manual',
          external_source_id: input.external_source_id || '',
          cost_per_unit: Number(input.cost_per_unit ?? 0),
          package_size: Number(input.package_size ?? 0),
          package_unit: input.package_unit || 'g',
          notes: input.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, ingredients: [ingredient, ...current.ingredients] }))
        return ingredient
      },
      updateIngredient(ingredientId, input) {
        setData((current) => ({
          ...current,
          ingredients: current.ingredients.map((ingredient) =>
            ingredient.id === ingredientId
              ? {
                  ...ingredient,
                  ...input,
                  normalized_name: input.normalized_name || normalizeName(input.name || ingredient.name),
                  calories_per_100g: Number(input.calories_per_100g ?? ingredient.calories_per_100g),
                  protein_g_per_100g: Number(input.protein_g_per_100g ?? ingredient.protein_g_per_100g),
                  carbs_g_per_100g: Number(input.carbs_g_per_100g ?? ingredient.carbs_g_per_100g),
                  fat_g_per_100g: Number(input.fat_g_per_100g ?? ingredient.fat_g_per_100g),
                  fiber_g_per_100g: Number(input.fiber_g_per_100g ?? ingredient.fiber_g_per_100g),
                  sugar_g_per_100g: Number(input.sugar_g_per_100g ?? ingredient.sugar_g_per_100g),
                  sodium_mg_per_100g: Number(input.sodium_mg_per_100g ?? ingredient.sodium_mg_per_100g),
                  calcium_mg_per_100g: Number(input.calcium_mg_per_100g ?? ingredient.calcium_mg_per_100g ?? 0),
                  iron_mg_per_100g: Number(input.iron_mg_per_100g ?? ingredient.iron_mg_per_100g ?? 0),
                  cost_per_unit: Number(input.cost_per_unit ?? ingredient.cost_per_unit ?? 0),
                  package_size: Number(input.package_size ?? ingredient.package_size ?? 0),
                  updated_at: new Date().toISOString(),
                }
              : ingredient,
          ),
        }))
      },
      addRecipe(input, ingredientRows) {
        const recipe: Recipe = {
          id: uid('recipe'),
          owner_id: input.owner_id || profile?.id || ids.chef,
          family_id: input.family_id || data.families[0]?.id,
          scope: input.scope || (input.family_id || data.families[0]?.id ? 'family' : 'owner'),
          name: input.name || 'New Recipe',
          description: input.description || '',
          category: input.category || '',
          cuisine_type: input.cuisine_type || '',
          main_protein: input.main_protein || '',
          meal_style: input.meal_style || '',
          prep_time_minutes: Number(input.prep_time_minutes ?? 0),
          cook_time_minutes: Number(input.cook_time_minutes ?? 0),
          servings: Number(input.servings ?? 4),
          serving_size_g: Number(input.serving_size_g ?? 250),
          instructions: input.instructions || '',
          reheating_instructions: input.reheating_instructions || '',
          chef_notes: input.chef_notes || '',
          is_freezer_friendly: input.is_freezer_friendly ?? false,
          is_school_friendly: input.is_school_friendly ?? false,
          is_gluten_free: input.is_gluten_free ?? false,
          visible_melted_cheese: input.visible_melted_cheese ?? false,
          status: input.status || 'draft',
          image_url: input.image_url || '',
          ai_generated: input.ai_generated ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const rows: RecipeIngredient[] = ingredientRows.map((row) => ({
          id: uid('recipe-ingredient'),
          recipe_id: recipe.id,
          ingredient_id: row.ingredient_id || data.ingredients[0]?.id,
          quantity_g: Number(row.quantity_g ?? 1),
          display_quantity: `${Number(row.quantity_g ?? 1)} g`,
          is_optional: row.is_optional ?? false,
          preparation_note: row.preparation_note || '',
          notes: row.notes || '',
          created_at: new Date().toISOString(),
        }))
        setData((current) => ({
          ...current,
          recipes: [recipe, ...current.recipes],
          recipeIngredients: [...rows, ...current.recipeIngredients],
        }))
        return recipe
      },
      updateRecipe(recipeId, input, ingredientRows) {
        const rows = ingredientRows?.map((row) => ({
          id: row.id || uid('recipe-ingredient'),
          recipe_id: recipeId,
          ingredient_id: row.ingredient_id || data.ingredients[0]?.id,
          quantity_g: Number(row.quantity_g ?? 1),
          display_quantity: `${Number(row.quantity_g ?? 1)} g`,
          is_optional: row.is_optional ?? false,
          preparation_note: row.preparation_note || '',
          notes: row.notes || '',
          created_at: row.created_at || new Date().toISOString(),
        })) as RecipeIngredient[] | undefined
        setData((current) => ({
          ...current,
          recipes: current.recipes.map((recipe) =>
            recipe.id === recipeId
              ? {
                  ...recipe,
                  ...input,
                  servings: input.servings == null ? recipe.servings : Number(input.servings),
                  prep_time_minutes: input.prep_time_minutes == null ? recipe.prep_time_minutes : Number(input.prep_time_minutes),
                  cook_time_minutes: input.cook_time_minutes == null ? recipe.cook_time_minutes : Number(input.cook_time_minutes),
                  serving_size_g: input.serving_size_g == null ? recipe.serving_size_g : Number(input.serving_size_g),
                  updated_at: new Date().toISOString(),
                }
              : recipe,
          ),
          recipeIngredients: rows
            ? [...rows, ...current.recipeIngredients.filter((row) => row.recipe_id !== recipeId)]
            : current.recipeIngredients,
        }))
      },
      addAllergy(input) {
        const allergy: Allergy = {
          id: uid('allergy'),
          family_member_id: input.family_member_id || data.familyMembers[0]?.id || ids.soren,
          allergen_name: input.allergen_name || '',
          normalized_allergen_name: normalizeName(input.allergen_name || ''),
          severity: input.severity || 'moderate',
          reaction_notes: input.reaction_notes || '',
          avoid_traces: input.avoid_traces ?? false,
          cross_contact_risk: input.cross_contact_risk ?? true,
          emergency_notes: input.emergency_notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, allergies: [allergy, ...current.allergies] }))
        return allergy
      },
      updateAllergy(allergyId, input) {
        setData((current) => ({
          ...current,
          allergies: current.allergies.map((allergy) =>
            allergy.id === allergyId
              ? {
                  ...allergy,
                  ...input,
                  normalized_allergen_name: normalizeName(input.allergen_name || allergy.allergen_name),
                  updated_at: new Date().toISOString(),
                }
              : allergy,
          ),
        }))
      },
      addDietaryRestriction(input) {
        const restriction: DietaryRestriction = {
          id: uid('restriction'),
          family_member_id: input.family_member_id || data.familyMembers[0]?.id || ids.soren,
          restriction_type: input.restriction_type || '',
          description: input.description || '',
          is_medical: input.is_medical ?? false,
          created_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, dietaryRestrictions: [restriction, ...current.dietaryRestrictions] }))
        return restriction
      },
      addFoodPreference(input) {
        const preference: FoodPreference = {
          id: uid('preference'),
          family_member_id: input.family_member_id || data.familyMembers[0]?.id || ids.soren,
          preference_type: input.preference_type || 'likes',
          item_name: input.item_name || '',
          notes: input.notes || '',
          created_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, foodPreferences: [preference, ...current.foodPreferences] }))
        return preference
      },
      addMenuPlan(input) {
        const plan: MenuPlan = {
          id: uid('menu-plan'),
          family_id: input.family_id || data.families[0]?.id || ids.family,
          name: input.name || 'Weekly Menu',
          start_date: input.start_date || new Date().toISOString().slice(0, 10),
          end_date: input.end_date || new Date().toISOString().slice(0, 10),
          status: input.status || 'planned',
          created_by: input.created_by || profile?.id || ids.chef,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, menuPlans: [plan, ...current.menuPlans] }))
        return plan
      },
      addMenuPlanItem(input) {
        const item: MenuPlanItem = {
          id: uid('menu-item'),
          menu_plan_id: input.menu_plan_id || data.menuPlans[0]?.id || '',
          family_member_id: input.family_member_id,
          recipe_id: input.recipe_id || data.recipes[0]?.id || '',
          planned_date: input.planned_date || new Date().toISOString().slice(0, 10),
          meal_time: input.meal_time || 'dinner',
          servings: Number(input.servings ?? 1),
          portion_factor: Number(input.portion_factor ?? 1),
          planned_grams: Number(input.planned_grams ?? 0),
          calories: Number(input.calories ?? 0),
          protein_g: Number(input.protein_g ?? 0),
          allergy_status: input.allergy_status || 'review_needed',
          variety_status: input.variety_status || 'warning',
          notes: input.notes || '',
          override_reason: input.override_reason || '',
          ai_generated: input.ai_generated ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, menuPlanItems: [item, ...current.menuPlanItems] }))
        return item
      },
      removeMenuPlanItem(itemId) {
        setData((current) => ({
          ...current,
          menuPlanItems: current.menuPlanItems.filter((item) => item.id !== itemId),
        }))
        if (isSupabaseConfigured && supabase) {
          void supabase.from('menu_plan_items').delete().eq('id', itemId).then(({ error }) => {
            if (error) console.error('Menu item delete failed', error)
          })
        }
      },
      addPantryItem(input) {
        const item: PantryInventory = {
          id: uid('pantry'),
          family_id: input.family_id || data.families[0]?.id || ids.family,
          ingredient_id: input.ingredient_id || data.ingredients[0]?.id || '',
          quantity_available: Number(input.quantity_available ?? 0),
          unit: input.unit || 'g',
          min_quantity_alert: Number(input.min_quantity_alert ?? 0),
          expiration_date: input.expiration_date || undefined,
          location: input.location || '',
          notes: input.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, pantryInventory: [item, ...current.pantryInventory] }))
        return item
      },
      updatePantryItem(itemId, input) {
        setData((current) => ({
          ...current,
          pantryInventory: current.pantryInventory.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...input,
                  quantity_available: Number(input.quantity_available ?? item.quantity_available),
                  min_quantity_alert: Number(input.min_quantity_alert ?? item.min_quantity_alert),
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        }))
      },
      addFreezerItem(input) {
        const item: FreezerInventory = {
          id: uid('freezer'),
          family_id: input.family_id || data.families[0]?.id || ids.family,
          recipe_id: input.recipe_id || data.recipes[0]?.id || '',
          prepared_date: input.prepared_date || new Date().toISOString().slice(0, 10),
          expiration_date: input.expiration_date || new Date().toISOString().slice(0, 10),
          portions_available: Number(input.portions_available ?? 0),
          grams_per_portion: Number(input.grams_per_portion ?? 0),
          reheating_instructions: input.reheating_instructions || '',
          storage_notes: input.storage_notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, freezerInventory: [item, ...current.freezerInventory] }))
        return item
      },
      updateFreezerItem(itemId, input) {
        setData((current) => ({
          ...current,
          freezerInventory: current.freezerInventory.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...input,
                  portions_available: Number(input.portions_available ?? item.portions_available),
                  grams_per_portion: Number(input.grams_per_portion ?? item.grams_per_portion ?? 0),
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        }))
      },
      addShoppingList(input) {
        const list: ShoppingList = {
          id: uid('shopping-list'),
          family_id: input.family_id || data.families[0]?.id || ids.family,
          menu_plan_id: input.menu_plan_id,
          name: input.name || 'Shopping List',
          status: input.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, shoppingLists: [list, ...current.shoppingLists] }))
        return list
      },
      addShoppingListItem(input) {
        const item: ShoppingListItem = {
          id: uid('shopping-item'),
          shopping_list_id: input.shopping_list_id || data.shoppingLists[0]?.id || '',
          ingredient_id: input.ingredient_id || data.ingredients[0]?.id || '',
          required_quantity: Number(input.required_quantity ?? 0),
          available_quantity: Number(input.available_quantity ?? 0),
          missing_quantity: Number(input.missing_quantity ?? 0),
          unit: input.unit || 'g',
          is_checked: input.is_checked ?? false,
          notes: input.notes || '',
          created_at: new Date().toISOString(),
        }
        setData((current) => ({ ...current, shoppingListItems: [item, ...current.shoppingListItems] }))
        return item
      },
      updateShoppingListItem(itemId, input) {
        setData((current) => ({
          ...current,
          shoppingListItems: current.shoppingListItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...input,
                  required_quantity: Number(input.required_quantity ?? item.required_quantity),
                  available_quantity: Number(input.available_quantity ?? item.available_quantity),
                  missing_quantity: Number(input.missing_quantity ?? item.missing_quantity),
                }
              : item,
          ),
        }))
      },
      markAlertRead(alertId) {
        setData((current) => ({
          ...current,
          alerts: current.alerts.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert)),
        }))
      },
      markAllAlertsRead(alertIds) {
        const idSet = alertIds ? new Set(alertIds) : null
        setData((current) => ({
          ...current,
          alerts: current.alerts.map((alert) => (!idSet || idSet.has(alert.id) ? { ...alert, is_read: true } : alert)),
        }))
      },
      updateSettings(settings) {
        setData((current) => ({
          ...current,
          settings: { ...current.settings, ...settings, updated_at: new Date().toISOString() },
        }))
      },
      toggleShoppingItem(itemId) {
        setData((current) => ({
          ...current,
          shoppingListItems: current.shoppingListItems.map((item: ShoppingListItem) =>
            item.id === itemId ? { ...item, is_checked: !item.is_checked } : item,
          ),
        }))
      },
    }),
    [data, hydratedProfileId, isAuthenticated, profile, setData],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside AppDataProvider')
  return context
}
