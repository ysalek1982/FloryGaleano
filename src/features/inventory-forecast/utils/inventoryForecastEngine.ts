import type { AppData, Family, FreezerInventory, Ingredient, PantryInventory, Recipe } from '../../../lib/types'
import { daysBetween, todayIso } from '../../../lib/utils'
import { calculateProductionRows } from '../../../services/portionEngine'

export type PurchasePriority = 'critical' | 'high' | 'medium' | 'low' | 'use_soon' | 'freezer_first'

export interface PurchasePriorityRow {
  ingredient: Ingredient
  requiredQuantity: number
  availableQuantity: number
  missingQuantity: number
  unit: string
  priority: PurchasePriority
  reason: string
  earliestDate?: string
}

export interface FreezerFirstSuggestion {
  item: FreezerInventory
  recipe?: Recipe
  priority: PurchasePriority
  reason: string
  safeToApply: boolean
}

export interface InventoryForecast {
  pantryExpiringSoon: PantryInventory[]
  pantryLowStock: PantryInventory[]
  freezerExpiringSoon: FreezerInventory[]
  freezerLowPortions: FreezerInventory[]
  purchasePriorities: PurchasePriorityRow[]
  coveredByPantry: PurchasePriorityRow[]
  freezerFirstSuggestions: FreezerFirstSuggestion[]
}

function isWithinDays(date: string | undefined, days: number) {
  if (!date) return false
  const diff = daysBetween(todayIso(), date)
  return diff >= 0 && diff <= days
}

function priorityFor(daysUntilNeeded: number | undefined, missingQuantity: number, lowStock: boolean): PurchasePriority {
  if (missingQuantity > 0 && daysUntilNeeded !== undefined && daysUntilNeeded <= 2) return 'critical'
  if (missingQuantity > 0 && daysUntilNeeded !== undefined && daysUntilNeeded <= 5) return 'high'
  if (missingQuantity > 0 && daysUntilNeeded !== undefined && daysUntilNeeded <= 7) return 'medium'
  if (lowStock) return 'low'
  return 'use_soon'
}

export function calculateInventoryForecast(data: AppData, family: Family | undefined): InventoryForecast {
  if (!family) {
    return {
      pantryExpiringSoon: [],
      pantryLowStock: [],
      freezerExpiringSoon: [],
      freezerLowPortions: [],
      purchasePriorities: [],
      coveredByPantry: [],
      freezerFirstSuggestions: [],
    }
  }

  const pantry = data.pantryInventory.filter((item) => item.family_id === family.id)
  const freezer = data.freezerInventory.filter((item) => item.family_id === family.id)
  const diners = data.familyMembers.filter((diner) => diner.family_id === family.id && diner.is_active)
  const plans = data.menuPlans.filter((plan) => plan.family_id === family.id)
  const planIds = new Set(plans.map((plan) => plan.id))
  const upcomingItems = data.menuPlanItems.filter((item) => planIds.has(item.menu_plan_id) && daysBetween(todayIso(), item.planned_date) >= 0 && daysBetween(todayIso(), item.planned_date) <= 7)
  const recipes = upcomingItems
    .map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id))
    .filter((recipe): recipe is Recipe => Boolean(recipe))
  const earliestByRecipe = new Map(upcomingItems.map((item) => [item.recipe_id, item.planned_date]))
  const productionRows = calculateProductionRows(recipes, data.recipeIngredients, data.ingredients, diners, pantry)

  const pantryLowStock = pantry.filter((item) => item.quantity_available < item.min_quantity_alert)
  const pantryExpiringSoon = pantry.filter((item) => isWithinDays(item.expiration_date, 7))
  const freezerExpiringSoon = freezer.filter((item) => isWithinDays(item.expiration_date, 10))
  const freezerLowPortions = freezer.filter((item) => item.portions_available <= 2)
  const lowStockIngredientIds = new Set(pantryLowStock.map((item) => item.ingredient_id))

  const priorityRows = productionRows.map((row) => {
    const ingredient = data.ingredients.find((item) => item.id === row.ingredientId)!
    const recipeIds = recipes.filter((recipe) => row.usedInRecipes.includes(recipe.name)).map((recipe) => recipe.id)
    const earliestDate = recipeIds.map((id) => earliestByRecipe.get(id)).filter(Boolean).sort()[0]
    const daysUntilNeeded = earliestDate ? daysBetween(todayIso(), earliestDate) : undefined
    const priority = priorityFor(daysUntilNeeded, row.missingQuantity, lowStockIngredientIds.has(row.ingredientId))
    return {
      ingredient,
      requiredQuantity: row.requiredQuantity,
      availableQuantity: row.availableQuantity,
      missingQuantity: row.missingQuantity,
      unit: row.unit,
      priority,
      reason: row.missingQuantity > 0 ? 'missing_for_menu' : 'covered_by_pantry',
      earliestDate,
    }
  })

  return {
    pantryExpiringSoon,
    pantryLowStock,
    freezerExpiringSoon,
    freezerLowPortions,
    purchasePriorities: priorityRows.filter((row) => row.missingQuantity > 0 || row.priority === 'low'),
    coveredByPantry: priorityRows.filter((row) => row.missingQuantity === 0),
    freezerFirstSuggestions: freezerExpiringSoon.map((item) => ({
      item,
      recipe: data.recipes.find((recipe) => recipe.id === item.recipe_id),
      priority: 'freezer_first',
      reason: 'expiring_soon',
      safeToApply: true,
    })),
  }
}
