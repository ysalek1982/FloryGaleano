import { useMemo } from 'react'

import { useAppData } from '../../../lib/AppState'
import type { FamilyMember, MenuPlanItem, NutritionTotals } from '../../../lib/types'
import { addDays, todayIso } from '../../../lib/utils'
import { addNutrition, calculateDinerNutrition, calculateRecipeNutrition, emptyNutrition, hasMissingNutrition } from '../../../services/nutritionEngine'
import { nutritionStatus } from '../utils/nutritionFormatters'

export type DinerNutritionRow = {
  diner: FamilyMember
  daily: NutritionTotals
  weekly: NutritionTotals
  calorieStatus: string
  proteinStatus: string
}

export function useNutritionView() {
  const { data } = useAppData()

  return useMemo(() => {
    const today = todayIso()
    const weekEnd = addDays(today, 6)
    const activeDiners = data.familyMembers.filter((diner) => diner.is_active)
    const dailyItems = data.menuPlanItems.filter((item) => item.planned_date === today)
    const weeklyItems = data.menuPlanItems.filter((item) => item.planned_date >= today && item.planned_date <= weekEnd)

    const totalsFor = (diner: FamilyMember, items: MenuPlanItem[]) =>
      items
        .filter((item) => !item.family_member_id || item.family_member_id === diner.id)
        .reduce<NutritionTotals>((total, item) => {
          const recipe = data.recipes.find((candidate) => candidate.id === item.recipe_id)
          if (!recipe) return total
          return addNutrition(total, calculateDinerNutrition(recipe, data.recipeIngredients, data.ingredients, diner.portion_factor * item.portion_factor, item.servings))
        }, emptyNutrition)

    const dinerRows: DinerNutritionRow[] = activeDiners.map((diner) => {
      const daily = totalsFor(diner, dailyItems)
      const weekly = totalsFor(diner, weeklyItems)
      return {
        diner,
        daily,
        weekly,
        calorieStatus: nutritionStatus(daily.calories, diner.daily_calorie_target ?? 0),
        proteinStatus: nutritionStatus(daily.protein_g, diner.daily_protein_target_g ?? 0),
      }
    })

    const familyDaily = dinerRows.reduce<NutritionTotals>((total, row) => addNutrition(total, row.daily), emptyNutrition)
    const missingIngredients = data.ingredients.filter(hasMissingNutrition)
    const missingRecipes = data.recipes.filter((recipe) => calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients).missing_nutrition)
    const warningRows = dinerRows.filter((row) => row.calorieStatus !== 'adequate' || row.proteinStatus !== 'adequate')

    return {
      today,
      weekEnd,
      dinerRows,
      familyDaily,
      missingIngredients,
      missingRecipes,
      warningRows,
    }
  }, [data])
}
