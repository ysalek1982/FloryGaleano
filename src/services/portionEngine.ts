import type {
  FamilyMember,
  Ingredient,
  PantryInventory,
  Recipe,
  RecipeIngredient,
} from '../lib/types'
import { calculateDinerNutrition } from './nutritionEngine'

export interface DinerPortionRow {
  dinerId: string
  dinerName: string
  recipeId: string
  recipeName: string
  portionFactor: number
  servingEquivalent: number
  plannedGrams: number
  calories: number
  protein_g: number
}

export interface ProductionRow {
  ingredientId: string
  ingredientName: string
  requiredQuantity: number
  availableQuantity: number
  missingQuantity: number
  unit: string
  usedInRecipes: string[]
  allergyNotes: string[]
  purchaseNeeded: boolean
}

export interface BatchSummaryRow {
  recipeId: string
  recipeName: string
  totalServings: number
  totalGrams: number
  storageRecommendation: string
  freezerFriendly: boolean
  reheatingNotes: string
}

export function calculateDinerPortions(
  recipe: Recipe,
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
  diners: FamilyMember[],
  selectedServings = 1,
): DinerPortionRow[] {
  const recipeWeight = recipeIngredients
    .filter((item) => item.recipe_id === recipe.id)
    .reduce((sum, item) => sum + item.quantity_g, 0)
  const gramsPerServing = recipe.serving_size_g || recipeWeight / (recipe.servings || 1)

  return diners.map((diner) => {
    const servingEquivalent = diner.portion_factor * selectedServings
    const nutrition = calculateDinerNutrition(recipe, recipeIngredients, ingredients, diner.portion_factor, selectedServings)
    return {
      dinerId: diner.id,
      dinerName: diner.nickname || diner.full_name,
      recipeId: recipe.id,
      recipeName: recipe.name,
      portionFactor: diner.portion_factor,
      servingEquivalent,
      plannedGrams: gramsPerServing * servingEquivalent,
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
    }
  })
}

export function calculateProductionRows(
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
  diners: FamilyMember[],
  pantry: PantryInventory[],
): ProductionRow[] {
  const rows = new Map<string, ProductionRow>()
  const totalPortions = diners.reduce((sum, diner) => sum + diner.portion_factor, 0)

  for (const recipe of recipes) {
    const recipeRows = recipeIngredients.filter((item) => item.recipe_id === recipe.id)
    for (const item of recipeRows) {
      const ingredient = ingredients.find((candidate) => candidate.id === item.ingredient_id)
      if (!ingredient) continue
      const requiredQuantity = (item.quantity_g / (recipe.servings || 1)) * totalPortions
      const availableQuantity = pantry
        .filter((stock) => stock.ingredient_id === ingredient.id)
        .reduce((sum, stock) => sum + stock.quantity_available, 0)
      const existing = rows.get(ingredient.id)
      const nextRequired = (existing?.requiredQuantity ?? 0) + requiredQuantity
      rows.set(ingredient.id, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        requiredQuantity: nextRequired,
        availableQuantity,
        missingQuantity: Math.max(0, nextRequired - availableQuantity),
        unit: ingredient.default_unit,
        usedInRecipes: Array.from(new Set([...(existing?.usedInRecipes ?? []), recipe.name])),
        allergyNotes: existing?.allergyNotes ?? [],
        purchaseNeeded: nextRequired > availableQuantity,
      })
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
}

export function calculateBatchSummary(
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[],
  diners: FamilyMember[],
): BatchSummaryRow[] {
  const totalPortions = diners.reduce((sum, diner) => sum + diner.portion_factor, 0)
  return recipes.map((recipe) => {
    const baseWeight = recipeIngredients
      .filter((item) => item.recipe_id === recipe.id)
      .reduce((sum, item) => sum + item.quantity_g, 0)
    const totalGrams = (baseWeight / (recipe.servings || 1)) * totalPortions
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      totalServings: totalPortions,
      totalGrams,
      storageRecommendation: recipe.is_freezer_friendly ? 'freeze_or_refrigerate' : 'serve_fresh',
      freezerFriendly: recipe.is_freezer_friendly,
      reheatingNotes: recipe.reheating_instructions || '',
    }
  })
}
