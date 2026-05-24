import type {
  Alert,
  Allergy,
  AppSettings,
  Family,
  FamilyMember,
  FreezerInventory,
  Ingredient,
  MenuPlanItem,
  PantryInventory,
  Recipe,
  RecipeIngredient,
} from '../lib/types'
import { daysBetween, todayIso } from '../lib/utils'
import { validateRecipeForFamily } from './allergyShield'
import { calculateRecipeNutrition } from './nutritionEngine'
import { calculateProductionRows } from './portionEngine'

export interface AlertContext {
  family: Family
  diners: FamilyMember[]
  allergies: Allergy[]
  ingredients: Ingredient[]
  recipes: Recipe[]
  recipeIngredients: RecipeIngredient[]
  menuItems: MenuPlanItem[]
  pantry: PantryInventory[]
  freezer: FreezerInventory[]
  settings: AppSettings
}

function alert(
  index: number,
  familyId: string,
  type: string,
  severity: Alert['severity'],
  titleKey: string,
  messageKey: string,
  relatedTable?: string,
  relatedId?: string,
): Alert {
  return {
    id: `generated-alert-${type}-${index}`,
    family_id: familyId,
    type,
    severity,
    title_key: titleKey,
    message_key: messageKey,
    related_table: relatedTable,
    related_id: relatedId,
    is_read: false,
    created_at: new Date().toISOString(),
  }
}

export function generateAlerts(context: AlertContext): Alert[] {
  const alerts: Alert[] = []
  const today = todayIso()
  const activeRecipes = context.recipes.filter((recipe) =>
    context.menuItems.some((item) => item.recipe_id === recipe.id && item.planned_date >= today),
  )

  const productionRows = calculateProductionRows(
    activeRecipes,
    context.recipeIngredients,
    context.ingredients,
    context.diners,
    context.pantry,
  )
  if (productionRows.some((row) => row.missingQuantity > 0)) {
    alerts.push(alert(alerts.length, context.family.id, 'missing_ingredient', 'warning', 'alerts.missingIngredient', 'alerts.missingIngredientMessage'))
  }

  for (const recipe of context.recipes) {
    const nutrition = calculateRecipeNutrition(recipe, context.recipeIngredients, context.ingredients)
    if (nutrition.missing_nutrition) {
      alerts.push(alert(alerts.length, context.family.id, 'missing_nutrition', 'info', 'alerts.missingNutrition', 'alerts.missingNutritionMessage', 'recipes', recipe.id))
    }

    const safetyMatrix = validateRecipeForFamily(
      recipe,
      context.diners,
      context.allergies,
      context.recipeIngredients,
      context.ingredients,
    )
    if (safetyMatrix.some((row) => row.status === 'blocked')) {
      alerts.push(alert(alerts.length, context.family.id, 'blocked_recipe', 'critical', 'alerts.blockedRecipe', 'alerts.blockedRecipeMessage', 'recipes', recipe.id))
    } else if (safetyMatrix.some((row) => row.status === 'review_needed')) {
      alerts.push(alert(alerts.length, context.family.id, 'review_recipe', 'warning', 'alerts.reviewRecipe', 'alerts.reviewRecipeMessage', 'recipes', recipe.id))
    }
  }

  for (const diner of context.diners) {
    if (!diner.daily_calorie_target || !diner.daily_protein_target_g || !diner.age_years) {
      alerts.push(alert(alerts.length, context.family.id, 'diner_profile_incomplete', 'info', 'alerts.profileIncomplete', 'alerts.profileIncompleteMessage', 'family_members', diner.id))
      continue
    }

    const dayItems = context.menuItems.filter((item) => item.planned_date === today)
    const calories = dayItems.reduce((sum, item) => sum + (item.calories ?? 0) * diner.portion_factor, 0)
    const protein = dayItems.reduce((sum, item) => sum + (item.protein_g ?? 0) * diner.portion_factor, 0)
    if (calories < diner.daily_calorie_target * context.settings.nutrition_low_threshold_pct) {
      alerts.push(alert(alerts.length, context.family.id, 'low_calories', 'warning', 'alerts.lowCalories', 'alerts.lowCaloriesMessage', 'family_members', diner.id))
    }
    if (protein < diner.daily_protein_target_g * context.settings.nutrition_low_threshold_pct) {
      alerts.push(alert(alerts.length, context.family.id, 'low_protein', 'warning', 'alerts.lowProtein', 'alerts.lowProteinMessage', 'family_members', diner.id))
    }
  }

  for (const item of context.freezer) {
    const daysToExpiration = daysBetween(today, item.expiration_date)
    if (daysToExpiration >= 0 && daysToExpiration <= 7) {
      alerts.push(alert(alerts.length, context.family.id, 'freezer_expiring', 'warning', 'alerts.freezerExpiring', 'alerts.freezerExpiringMessage', 'freezer_inventory', item.id))
    }
    if (item.portions_available <= 2) {
      alerts.push(alert(alerts.length, context.family.id, 'freezer_low', 'info', 'alerts.freezerLow', 'alerts.freezerLowMessage', 'freezer_inventory', item.id))
    }
  }

  for (const item of context.menuItems) {
    if (item.variety_status === 'blocked') {
      alerts.push(alert(alerts.length, context.family.id, 'repeated_dish', 'warning', 'alerts.repeatedDish', 'alerts.repeatedDishMessage', 'menu_plan_items', item.id))
    }
    if (!item.recipe_id) {
      alerts.push(alert(alerts.length, context.family.id, 'unassigned_slot', 'info', 'alerts.unassignedSlot', 'alerts.unassignedSlotMessage', 'menu_plan_items', item.id))
    }
  }

  return alerts
}
