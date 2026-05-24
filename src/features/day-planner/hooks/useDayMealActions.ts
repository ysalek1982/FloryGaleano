import { useTranslation } from 'react-i18next'

import { useAppData } from '../../../lib/AppState'
import type { MealTime } from '../../../lib/types'
import { addDays } from '../../../lib/utils'
import { validateRecipeForFamily } from '../../../services/allergyShield'
import { validateRecipeRotation } from '../../../services/menuRotationEngine'
import { calculateRecipeNutrition } from '../../../services/nutritionEngine'

export function useDayMealActions() {
  const { t } = useTranslation()
  const { data, addMenuPlan, addMenuPlanItem, removeMenuPlanItem } = useAppData()

  const addRecipeToSlot = ({
    familyId,
    date,
    mealTime,
    recipeId,
    dinerId,
    overrideReason,
    onError,
  }: {
    familyId: string
    date: string
    mealTime: MealTime
    recipeId: string
    dinerId: string
    overrideReason?: string
    onError: (message: string) => void
  }) => {
    const recipe = data.recipes.find((item) => item.id === recipeId)
    if (!recipe) return
    const plan = data.menuPlans.find((item) => item.family_id === familyId && item.start_date <= date && item.end_date >= date)
      || addMenuPlan({ family_id: familyId, name: `${t('nav.dayPlanner')} ${date}`, start_date: date, end_date: addDays(date, 6), status: 'planned' })
    const familyDiners = data.familyMembers.filter((diner) => diner.family_id === familyId && diner.is_active)
    const diners = dinerId === 'all' ? familyDiners : familyDiners.filter((diner) => diner.id === dinerId)
    const safety = validateRecipeForFamily(recipe, diners, data.allergies, data.recipeIngredients, data.ingredients)
    const allergyStatus = safety.some((row) => row.status === 'blocked') ? 'blocked' : safety.some((row) => row.status === 'review_needed') ? 'review_needed' : 'safe'
    const rotation = validateRecipeRotation(recipe, date, data.menuPlanItems, data.settings.default_variety_days, overrideReason)
    if ((allergyStatus === 'blocked' || rotation.status === 'blocked') && !overrideReason) {
      onError(t('validation.overrideRequired'))
      return
    }
    const nutrition = calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients)
    addMenuPlanItem({
      menu_plan_id: plan.id,
      family_member_id: dinerId === 'all' ? undefined : dinerId,
      recipe_id: recipe.id,
      planned_date: date,
      meal_time: mealTime,
      servings: 1,
      portion_factor: 1,
      planned_grams: recipe.serving_size_g,
      calories: nutrition.calories_per_serving,
      protein_g: nutrition.protein_g_per_serving,
      allergy_status: allergyStatus,
      variety_status: rotation.status,
      override_reason: overrideReason,
    })
    onError('')
  }

  return { addRecipeToSlot, removeMenuPlanItem }
}
