import { useLocation } from 'react-router-dom'

import { useAppData } from '../../../lib/AppState'
import { todayIso } from '../../../lib/utils'
import type { AiCopilotPageContext } from '../types'
import { pageIdFromPath } from '../utils/aiCopilotFormatters'

export function useAiPageContext(overrides?: Partial<AiCopilotPageContext>): AiCopilotPageContext {
  const location = useLocation()
  const { data } = useAppData()
  const pageId = overrides?.page_id || pageIdFromPath(location.pathname)
  const selectedFamilyId = overrides?.selected_family_id || data.families[0]?.id
  const familyRecipes = data.recipes.filter((recipe) => !selectedFamilyId || recipe.family_id === selectedFamilyId || recipe.scope === 'global')
  const familyMenuPlans = data.menuPlans.filter((plan) => !selectedFamilyId || plan.family_id === selectedFamilyId)

  return {
    page_id: pageId,
    selected_family_id: selectedFamilyId,
    selected_date: overrides?.selected_date || todayIso(),
    selected_week: overrides?.selected_week,
    selected_recipe_id: overrides?.selected_recipe_id,
    selected_ingredient_id: overrides?.selected_ingredient_id,
    selected_menu_plan_id: overrides?.selected_menu_plan_id || familyMenuPlans[0]?.id,
    selected_diner_ids: overrides?.selected_diner_ids,
    relevant_records: {
      family_count: data.families.length,
      diner_count: data.familyMembers.filter((diner) => !selectedFamilyId || diner.family_id === selectedFamilyId).length,
      recipe_count: familyRecipes.length,
      ingredient_count: data.ingredients.length,
      alert_count: data.alerts.filter((alert) => !selectedFamilyId || alert.family_id === selectedFamilyId).length,
      pantry_rows: data.pantryInventory.filter((item) => !selectedFamilyId || item.family_id === selectedFamilyId).length,
      freezer_rows: data.freezerInventory.filter((item) => !selectedFamilyId || item.family_id === selectedFamilyId).length,
      ...(overrides?.relevant_records || {}),
    },
  }
}
