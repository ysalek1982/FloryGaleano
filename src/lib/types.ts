export type Role = 'super_admin' | 'chef' | 'family_admin' | 'viewer'
export type Language = 'en' | 'es'
export type ActivityLevel = 'low' | 'moderate' | 'high' | 'athlete'
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'anaphylaxis'
export type PreferenceType = 'likes' | 'dislikes' | 'avoid' | 'favorite'
export type RecipeStatus = 'draft' | 'active' | 'archived'
export type MenuPlanStatus = 'draft' | 'planned' | 'approved' | 'completed'
export type MealTime =
  | 'breakfast'
  | 'school_lunch'
  | 'lunch'
  | 'snack'
  | 'sport_snack'
  | 'dinner'
  | 'evening_snack'
export type AllergyStatus = 'safe' | 'review_needed' | 'blocked'
export type VarietyStatus = 'allowed' | 'warning' | 'blocked'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type ShoppingListStatus = 'draft' | 'active' | 'purchased'

export interface Timestamped {
  created_at: string
  updated_at?: string
}

export interface Profile extends Timestamped {
  id: string
  full_name: string
  email: string
  role: Role
  preferred_language: Language
  avatar_url?: string
}

export interface Family extends Timestamped {
  id: string
  name: string
  description?: string
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  address?: string
  notes?: string
  owner_id: string
  chef_id?: string
}

export interface FamilyMember extends Timestamped {
  id: string
  family_id: string
  full_name: string
  nickname?: string
  birth_date?: string
  age_years?: number
  gender?: string
  height_cm?: number
  weight_kg?: number
  activity_level: ActivityLevel
  portion_factor: number
  daily_calorie_target?: number
  daily_protein_target_g?: number
  notes?: string
  is_active: boolean
}

export interface Allergy extends Timestamped {
  id: string
  family_member_id: string
  allergen_name: string
  normalized_allergen_name: string
  severity: AllergySeverity
  reaction_notes?: string
  avoid_traces: boolean
  cross_contact_risk: boolean
  emergency_notes?: string
}

export interface DietaryRestriction {
  id: string
  family_member_id: string
  restriction_type: string
  description?: string
  is_medical: boolean
  created_at: string
}

export interface FoodPreference {
  id: string
  family_member_id: string
  preference_type: PreferenceType
  item_name: string
  notes?: string
  created_at: string
}

export interface Ingredient extends Timestamped {
  id: string
  owner_id: string
  family_id?: string
  scope?: 'global' | 'owner' | 'family'
  name: string
  normalized_name: string
  category?: string
  default_unit: string
  calories_per_100g: number
  protein_g_per_100g: number
  carbs_g_per_100g: number
  fat_g_per_100g: number
  fiber_g_per_100g: number
  sugar_g_per_100g: number
  sodium_mg_per_100g: number
  calcium_mg_per_100g?: number
  iron_mg_per_100g?: number
  contains_gluten: boolean
  contains_dairy: boolean
  contains_egg: boolean
  contains_fish: boolean
  contains_shellfish: boolean
  contains_tree_nuts: boolean
  contains_peanuts: boolean
  contains_sesame: boolean
  contains_soy: boolean
  allergen_tags: string[]
  may_contain_tags: string[]
  allowed_exceptions: string[]
  blocked_derivatives: string[]
  source: 'manual' | 'USDA' | 'AI' | 'imported'
  external_source_id?: string
  cost_per_unit?: number
  package_size?: number
  package_unit?: string
  notes?: string
}

export interface Recipe extends Timestamped {
  id: string
  owner_id: string
  family_id?: string
  scope?: 'global' | 'owner' | 'family'
  name: string
  description?: string
  category?: string
  cuisine_type?: string
  main_protein?: string
  meal_style?: string
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  serving_size_g?: number
  instructions: string
  reheating_instructions?: string
  chef_notes?: string
  is_freezer_friendly: boolean
  is_school_friendly: boolean
  is_gluten_free: boolean
  visible_melted_cheese: boolean
  status: RecipeStatus
  image_url?: string
  ai_generated?: boolean
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity_g: number
  display_quantity?: string
  is_optional: boolean
  preparation_note?: string
  notes?: string
  created_at: string
}

export interface NutritionTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  calcium_mg: number
  iron_mg: number
}

export interface RecipeNutritionCache {
  recipe_id: string
  total_weight_g: number
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  total_fiber_g: number
  total_sugar_g: number
  total_sodium_mg: number
  total_calcium_mg: number
  total_iron_mg: number
  calories_per_serving: number
  protein_g_per_serving: number
  carbs_g_per_serving: number
  fat_g_per_serving: number
  calculated_at: string
  missing_nutrition: boolean
}

export interface MenuPlan extends Timestamped {
  id: string
  family_id: string
  name: string
  start_date: string
  end_date: string
  status: MenuPlanStatus
  created_by: string
}

export interface MenuPlanItem extends Timestamped {
  id: string
  menu_plan_id: string
  family_member_id?: string
  recipe_id: string
  planned_date: string
  meal_time: MealTime
  servings: number
  portion_factor: number
  planned_grams?: number
  calories?: number
  protein_g?: number
  allergy_status: AllergyStatus
  variety_status: VarietyStatus
  notes?: string
  override_reason?: string
  ai_generated?: boolean
}

export interface PantryInventory extends Timestamped {
  id: string
  family_id: string
  ingredient_id: string
  quantity_available: number
  unit: string
  min_quantity_alert: number
  expiration_date?: string
  location?: string
  notes?: string
}

export interface FreezerInventory extends Timestamped {
  id: string
  family_id: string
  recipe_id: string
  prepared_date: string
  expiration_date: string
  portions_available: number
  grams_per_portion?: number
  reheating_instructions?: string
  storage_notes?: string
}

export interface ShoppingList extends Timestamped {
  id: string
  family_id: string
  menu_plan_id?: string
  name: string
  status: ShoppingListStatus
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  ingredient_id: string
  required_quantity: number
  available_quantity: number
  missing_quantity: number
  unit: string
  is_checked: boolean
  notes?: string
  created_at: string
}

export interface Alert {
  id: string
  family_id: string
  family_member_id?: string
  type: string
  severity: AlertSeverity
  title_key: string
  message_key: string
  related_table?: string
  related_id?: string
  is_read: boolean
  created_at: string
}

export interface AppSettings extends Timestamped {
  id: string
  owner_id: string
  gemini_enabled: boolean
  ai_model: string
  default_variety_days: number
  default_units: 'metric' | 'imperial'
  default_language: Language
  theme: 'light' | 'system'
  nutrition_low_threshold_pct: number
  allergy_strictness: 'standard' | 'strict'
}

export interface AppData {
  profiles: Profile[]
  families: Family[]
  familyMembers: FamilyMember[]
  allergies: Allergy[]
  dietaryRestrictions: DietaryRestriction[]
  foodPreferences: FoodPreference[]
  ingredients: Ingredient[]
  recipes: Recipe[]
  recipeIngredients: RecipeIngredient[]
  menuPlans: MenuPlan[]
  menuPlanItems: MenuPlanItem[]
  pantryInventory: PantryInventory[]
  freezerInventory: FreezerInventory[]
  shoppingLists: ShoppingList[]
  shoppingListItems: ShoppingListItem[]
  alerts: Alert[]
  settings: AppSettings
}
