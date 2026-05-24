import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export function useRecipes(query = '') {
  const { data, addRecipe, updateRecipe, isDataLoading } = useAppData()
  const recipes = useMemo(
    () => data.recipes.filter((recipe) => recipe.name.toLowerCase().includes(query.toLowerCase())),
    [data.recipes, query],
  )

  return {
    recipes,
    recipeIngredients: data.recipeIngredients,
    isLoading: isDataLoading,
    error: null as string | null,
    addRecipe,
    updateRecipe,
  }
}
