import type { Ingredient, NutritionTotals, Recipe, RecipeIngredient, RecipeNutritionCache } from '../lib/types'

export const emptyNutrition: NutritionTotals = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
  calcium_mg: 0,
  iron_mg: 0,
}

export function ingredientNutritionForGrams(ingredient: Ingredient, grams: number): NutritionTotals {
  const factor = grams / 100
  return {
    calories: ingredient.calories_per_100g * factor,
    protein_g: ingredient.protein_g_per_100g * factor,
    carbs_g: ingredient.carbs_g_per_100g * factor,
    fat_g: ingredient.fat_g_per_100g * factor,
    fiber_g: ingredient.fiber_g_per_100g * factor,
    sugar_g: ingredient.sugar_g_per_100g * factor,
    sodium_mg: ingredient.sodium_mg_per_100g * factor,
    calcium_mg: (ingredient.calcium_mg_per_100g ?? 0) * factor,
    iron_mg: (ingredient.iron_mg_per_100g ?? 0) * factor,
  }
}

export function addNutrition(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
    sugar_g: a.sugar_g + b.sugar_g,
    sodium_mg: a.sodium_mg + b.sodium_mg,
    calcium_mg: a.calcium_mg + b.calcium_mg,
    iron_mg: a.iron_mg + b.iron_mg,
  }
}

export function hasMissingNutrition(ingredient: Ingredient) {
  return (
    ingredient.calories_per_100g === 0 &&
    ingredient.protein_g_per_100g === 0 &&
    ingredient.carbs_g_per_100g === 0 &&
    ingredient.fat_g_per_100g === 0
  )
}

export function calculateRecipeNutrition(
  recipe: Recipe,
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
): RecipeNutritionCache {
  const relevant = recipeIngredients.filter((item) => item.recipe_id === recipe.id)
  let missing = false
  const totals = relevant.reduce<NutritionTotals>((acc, item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredient_id)
    if (!ingredient) {
      missing = true
      return acc
    }
    if (hasMissingNutrition(ingredient)) missing = true
    return addNutrition(acc, ingredientNutritionForGrams(ingredient, item.quantity_g))
  }, emptyNutrition)

  const servings = recipe.servings || 1
  const totalWeight = relevant.reduce((sum, item) => sum + item.quantity_g, 0)

  return {
    recipe_id: recipe.id,
    total_weight_g: totalWeight,
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
    total_carbs_g: totals.carbs_g,
    total_fat_g: totals.fat_g,
    total_fiber_g: totals.fiber_g,
    total_sugar_g: totals.sugar_g,
    total_sodium_mg: totals.sodium_mg,
    total_calcium_mg: totals.calcium_mg,
    total_iron_mg: totals.iron_mg,
    calories_per_serving: totals.calories / servings,
    protein_g_per_serving: totals.protein_g / servings,
    carbs_g_per_serving: totals.carbs_g / servings,
    fat_g_per_serving: totals.fat_g / servings,
    calculated_at: new Date().toISOString(),
    missing_nutrition: missing,
  }
}

export function calculateDinerNutrition(
  recipe: Recipe,
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
  portionFactor: number,
  selectedServings = 1,
): NutritionTotals {
  const cache = calculateRecipeNutrition(recipe, recipeIngredients, ingredients)
  const multiplier = (portionFactor * selectedServings) / (recipe.servings || 1)
  return {
    calories: cache.total_calories * multiplier,
    protein_g: cache.total_protein_g * multiplier,
    carbs_g: cache.total_carbs_g * multiplier,
    fat_g: cache.total_fat_g * multiplier,
    fiber_g: cache.total_fiber_g * multiplier,
    sugar_g: cache.total_sugar_g * multiplier,
    sodium_mg: cache.total_sodium_mg * multiplier,
    calcium_mg: cache.total_calcium_mg * multiplier,
    iron_mg: cache.total_iron_mg * multiplier,
  }
}
