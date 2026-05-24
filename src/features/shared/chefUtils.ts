import type { MealTime, Recipe } from '../../lib/types'
import type { useAppData } from '../../lib/AppState'
import { validateRecipeForFamily } from '../../services/allergyShield'

export const mealTimes: MealTime[] = [
  'breakfast',
  'school_lunch',
  'lunch',
  'snack',
  'sport_snack',
  'dinner',
  'evening_snack',
]

export function tagsToText(tags?: string[]) {
  return (tags || []).join(', ')
}

export function textToTags(value?: string) {
  return (value || '').split(',').map((tag) => tag.trim()).filter(Boolean)
}

export function getRecipeSafetyStatus(recipe: Recipe, data: ReturnType<typeof useAppData>['data']) {
  const safety = validateRecipeForFamily(recipe, data.familyMembers, data.allergies, data.recipeIngredients, data.ingredients)
  return safety.some((row) => row.status === 'blocked') ? 'blocked' : safety.some((row) => row.status === 'review_needed') ? 'review_needed' : 'safe'
}
