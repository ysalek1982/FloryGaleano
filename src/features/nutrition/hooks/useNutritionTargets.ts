import type { FamilyMember, NutritionTotals } from '../../../lib/types'
import { nutritionStatus } from '../utils/nutritionFormatters'

export function useNutritionTargets(diner: FamilyMember, nutrition: NutritionTotals) {
  return {
    calories: {
      value: nutrition.calories,
      target: diner.daily_calorie_target ?? 0,
      status: nutritionStatus(nutrition.calories, diner.daily_calorie_target ?? 0),
    },
    protein: {
      value: nutrition.protein_g,
      target: diner.daily_protein_target_g ?? 0,
      status: nutritionStatus(nutrition.protein_g, diner.daily_protein_target_g ?? 0),
    },
  }
}
