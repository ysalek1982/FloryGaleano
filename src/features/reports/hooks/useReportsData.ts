import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import type { Recipe } from '../../../lib/types'
import { calculateRecipeNutrition } from '../../../services/nutritionEngine'
import { calculateProductionRows } from '../../../services/portionEngine'
import { reportDateRange, generatedTimestamp } from '../utils/reportFormatters'

export type ReportType =
  | 'all'
  | 'weeklyMenu'
  | 'dinerMenu'
  | 'productionSheet'
  | 'shoppingList'
  | 'missingIngredients'
  | 'allergyReport'
  | 'nutritionReport'
  | 'freezerReport'
  | 'pantryLow'

export function useReportsData() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const [reportType, setReportType] = useState<ReportType>('all')

  return useMemo(() => {
    const family = data.families.find((candidate) => candidate.id === familyId) || data.families[0]
    const diners = data.familyMembers.filter((diner) => diner.family_id === family?.id && diner.is_active)
    const plans = data.menuPlans.filter((plan) => plan.family_id === family?.id)
    const activePlan = plans[0]
    const menuItems = data.menuPlanItems.filter((item) => item.menu_plan_id === activePlan?.id)
    const recipes = menuItems
      .map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
    const productionRows = calculateProductionRows(recipes, data.recipeIngredients, data.ingredients, diners, data.pantryInventory.filter((item) => item.family_id === family?.id))
    const allergies = data.allergies.filter((allergy) => diners.some((diner) => diner.id === allergy.family_member_id))
    const lowStock = data.pantryInventory.filter((item) => item.family_id === family?.id && item.quantity_available < item.min_quantity_alert)
    const freezerRows = data.freezerInventory.filter((item) => item.family_id === family?.id)
    const shoppingLists = data.shoppingLists.filter((list) => list.family_id === family?.id)
    const shoppingItems = data.shoppingListItems.filter((item) => shoppingLists.some((list) => list.id === item.shopping_list_id))
    const nutritionRows = recipes.map((recipe) => ({ recipe, nutrition: calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients) }))

    return {
      data,
      family,
      familyId: family?.id || familyId,
      setFamilyId,
      reportType,
      setReportType,
      generatedAt: generatedTimestamp(),
      dateRange: activePlan ? reportDateRange(activePlan.start_date, activePlan.end_date) : reportDateRange(),
      diners,
      activePlan,
      menuItems,
      recipes,
      productionRows,
      missingRows: productionRows.filter((row) => row.missingQuantity > 0),
      allergies,
      lowStock,
      freezerRows,
      shoppingItems,
      nutritionRows,
    }
  }, [data, familyId, reportType])
}
