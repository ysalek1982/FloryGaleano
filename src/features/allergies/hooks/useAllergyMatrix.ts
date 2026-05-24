import { useMemo } from 'react'

import type { FamilyMember, Recipe } from '../../../lib/types'
import { useAppData } from '../../../lib/AppState'
import { validateRecipeForFamily } from '../../../services/allergyShield'

export function useAllergyMatrix(recipe?: Recipe, diners?: FamilyMember[]) {
  const { data } = useAppData()
  return useMemo(
    () => recipe ? validateRecipeForFamily(recipe, diners || data.familyMembers, data.allergies, data.recipeIngredients, data.ingredients) : [],
    [data.allergies, data.familyMembers, data.ingredients, data.recipeIngredients, diners, recipe],
  )
}
