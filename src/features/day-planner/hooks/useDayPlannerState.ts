import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import type { MealTime, Recipe } from '../../../lib/types'
import { todayIso } from '../../../lib/utils'
import { generateAlerts } from '../../../services/alertsEngine'
import { calculateProductionRows } from '../../../services/portionEngine'
import { mealTimes } from '../../shared/chefUtils'

export type DayAiSuggestion = {
  title?: string
  recipe_id?: string
  meal_time?: MealTime
  safety_status?: 'safe' | 'review_needed' | 'blocked'
  usable?: boolean
  ingredients?: string[]
}

export function useDayPlannerState() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const [date, setDate] = useState(todayIso())
  const [slot, setSlot] = useState<{ date: string; mealTime: MealTime } | null>(null)
  const [error, setError] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<DayAiSuggestion[]>([])

  return useMemo(() => {
    const family = data.families.find((candidate) => candidate.id === familyId) || data.families[0]
    const activeFamilyId = family?.id || familyId
    const plan = data.menuPlans.find((item) => item.family_id === activeFamilyId && item.start_date <= date && item.end_date >= date)
      || data.menuPlans.find((item) => item.family_id === activeFamilyId)
    const diners = data.familyMembers.filter((diner) => diner.family_id === activeFamilyId && diner.is_active)
    const dayItems = data.menuPlanItems
      .filter((item) => item.planned_date === date && data.menuPlans.find((planItem) => planItem.id === item.menu_plan_id)?.family_id === activeFamilyId)
      .sort((a, b) => mealTimes.indexOf(a.meal_time) - mealTimes.indexOf(b.meal_time))
    const recipes = dayItems
      .map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
    const productionRows = calculateProductionRows(recipes, data.recipeIngredients, data.ingredients, diners, data.pantryInventory.filter((item) => item.family_id === activeFamilyId))
    const alerts = family
      ? generateAlerts({
          family,
          diners,
          allergies: data.allergies,
          ingredients: data.ingredients,
          recipes: data.recipes,
          recipeIngredients: data.recipeIngredients,
          menuItems: dayItems,
          pantry: data.pantryInventory,
          freezer: data.freezerInventory,
          settings: data.settings,
        })
      : []

    return {
      data,
      family,
      familyId: activeFamilyId,
      setFamilyId,
      date,
      setDate,
      plan,
      diners,
      dayItems,
      productionRows,
      alerts,
      slot,
      setSlot,
      error,
      setError,
      aiSuggestions,
      setAiSuggestions,
    }
  }, [aiSuggestions, data, date, error, familyId, slot])
}
