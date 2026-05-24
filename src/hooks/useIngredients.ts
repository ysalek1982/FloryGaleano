import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export type IngredientFilters = {
  query?: string
  category?: string
  source?: string
  missingNutrition?: boolean
}

export function useIngredients(filters: IngredientFilters = {}) {
  const { data, addIngredient, updateIngredient, isDataLoading } = useAppData()
  const ingredients = useMemo(() => data.ingredients
    .filter((ingredient) => !filters.query || ingredient.name.toLowerCase().includes(filters.query.toLowerCase()))
    .filter((ingredient) => !filters.category || filters.category === 'all' || ingredient.category === filters.category)
    .filter((ingredient) => !filters.source || filters.source === 'all' || ingredient.source === filters.source)
    .filter((ingredient) => !filters.missingNutrition || ingredient.calories_per_100g === 0 || ingredient.protein_g_per_100g === 0),
  [data.ingredients, filters.category, filters.missingNutrition, filters.query, filters.source])

  return {
    ingredients,
    isLoading: isDataLoading,
    error: null as string | null,
    addIngredient,
    updateIngredient,
  }
}
