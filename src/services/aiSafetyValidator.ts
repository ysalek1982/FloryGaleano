import type {
  Allergy,
  FamilyMember,
  Ingredient,
  MenuPlanItem,
  Recipe,
  RecipeIngredient,
} from '../lib/types'
import { validateRecipeForFamily } from './allergyShield'
import { validateRecipeRotation } from './menuRotationEngine'

export interface AiSuggestion {
  id: string
  title: string
  recipeId?: string
  plannedDate?: string
  ingredients?: string[]
  confidence: number
  source: 'gemini' | 'local'
}

export interface AiValidationResult {
  usable: boolean
  allergyStatus: 'safe' | 'review_needed' | 'blocked'
  rotationStatus: 'allowed' | 'warning' | 'blocked'
  reasons: string[]
}

export function validateAiSuggestion(
  suggestion: AiSuggestion,
  context: {
    recipes: Recipe[]
    diners: FamilyMember[]
    allergies: Allergy[]
    recipeIngredients: RecipeIngredient[]
    ingredients: Ingredient[]
    menuHistory: MenuPlanItem[]
    varietyDays: number
  },
): AiValidationResult {
  const recipe = context.recipes.find((candidate) => candidate.id === suggestion.recipeId)
  if (!recipe) {
    return {
      usable: false,
      allergyStatus: 'review_needed',
      rotationStatus: 'warning',
      reasons: ['ai_unknown_recipe'],
    }
  }

  const safety = validateRecipeForFamily(
    recipe,
    context.diners,
    context.allergies,
    context.recipeIngredients,
    context.ingredients,
  )
  const allergyStatus = safety.some((row) => row.status === 'blocked')
    ? 'blocked'
    : safety.some((row) => row.status === 'review_needed')
      ? 'review_needed'
      : 'safe'
  const rotation = validateRecipeRotation(
    recipe,
    suggestion.plannedDate || new Date().toISOString().slice(0, 10),
    context.menuHistory,
    context.varietyDays,
  )

  const reasons = [
    ...safety.flatMap((row) => row.reasons),
    ...(rotation.status === 'allowed' ? [] : ['rotation_not_ready']),
  ]

  return {
    usable: allergyStatus !== 'blocked' && rotation.status !== 'blocked',
    allergyStatus,
    rotationStatus: rotation.status,
    reasons,
  }
}
