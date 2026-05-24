import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import { validateIngredientForDiner, validateRecipeForDiner, validateRecipeForFamily } from '../../../services/allergyShield'

export function useAllergyTester() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const familyDiners = data.familyMembers.filter((diner) => diner.family_id === familyId && diner.is_active)
  const [dinerId, setDinerId] = useState(familyDiners[0]?.id || data.familyMembers[0]?.id || '')
  const [ingredientId, setIngredientId] = useState(data.ingredients[0]?.id || '')
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id || '')

  return useMemo(() => {
    const diners = data.familyMembers.filter((diner) => diner.family_id === familyId && diner.is_active)
    const diner = data.familyMembers.find((candidate) => candidate.id === dinerId) || diners[0]
    const ingredient = data.ingredients.find((candidate) => candidate.id === ingredientId)
    const recipe = data.recipes.find((candidate) => candidate.id === recipeId)
    const dinerAllergies = diner ? data.allergies.filter((allergy) => allergy.family_member_id === diner.id) : []
    const ingredientResult = ingredient && diner ? validateIngredientForDiner(ingredient, dinerAllergies) : undefined
    const recipeResult = recipe && diner ? validateRecipeForDiner(recipe, diner, data.allergies, data.recipeIngredients, data.ingredients) : undefined
    const familyMatrix = recipe ? validateRecipeForFamily(recipe, diners, data.allergies, data.recipeIngredients, data.ingredients) : []

    return {
      data,
      familyId,
      setFamilyId,
      dinerId: diner?.id || dinerId,
      setDinerId,
      ingredientId,
      setIngredientId,
      recipeId,
      setRecipeId,
      diners,
      diner,
      ingredient,
      recipe,
      ingredientResult,
      recipeResult,
      familyMatrix,
    }
  }, [data, dinerId, familyId, ingredientId, recipeId])
}
