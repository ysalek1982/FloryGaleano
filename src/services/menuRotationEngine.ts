import type { MenuPlanItem, Recipe, VarietyStatus } from '../lib/types'
import { daysBetween } from '../lib/utils'

export interface RotationResult {
  status: VarietyStatus
  daysSinceLastServed?: number
  waitMoreDays?: number
  lastServedDate?: string
  overrideRequired: boolean
}

export function validateRecipeRotation(
  recipe: Recipe,
  plannedDate: string,
  history: MenuPlanItem[],
  varietyDays = 21,
  overrideReason?: string,
): RotationResult {
  const previous = history
    .filter((item) => item.recipe_id === recipe.id && item.planned_date < plannedDate)
    .sort((a, b) => b.planned_date.localeCompare(a.planned_date))[0]

  if (!previous) {
    return { status: 'allowed', overrideRequired: false }
  }

  const daysSinceLastServed = daysBetween(previous.planned_date, plannedDate)
  if (daysSinceLastServed >= varietyDays) {
    return {
      status: 'allowed',
      daysSinceLastServed,
      waitMoreDays: 0,
      lastServedDate: previous.planned_date,
      overrideRequired: false,
    }
  }

  return {
    status: overrideReason ? 'warning' : 'blocked',
    daysSinceLastServed,
    waitMoreDays: varietyDays - daysSinceLastServed,
    lastServedDate: previous.planned_date,
    overrideRequired: !overrideReason,
  }
}

export function calculateVarietyScore(items: MenuPlanItem[], recipes: Recipe[]) {
  const recipeIds = new Set(items.map((item) => item.recipe_id))
  const styles = new Set(
    items
      .map((item) => recipes.find((recipe) => recipe.id === item.recipe_id)?.meal_style)
      .filter(Boolean),
  )
  const proteins = new Set(
    items
      .map((item) => recipes.find((recipe) => recipe.id === item.recipe_id)?.main_protein)
      .filter(Boolean),
  )
  const possible = Math.max(items.length, 1)
  return Math.min(100, Math.round(((recipeIds.size + styles.size + proteins.size) / (possible * 3)) * 100))
}

export function suggestSafeAlternatives(
  currentRecipe: Recipe,
  recipes: Recipe[],
  blockedRecipeIds: string[],
  limit = 3,
) {
  return recipes
    .filter((recipe) => recipe.id !== currentRecipe.id)
    .filter((recipe) => !blockedRecipeIds.includes(recipe.id))
    .filter((recipe) => recipe.status === 'active')
    .slice(0, limit)
}
