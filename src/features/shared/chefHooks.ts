import { useAppData, useAuth } from '../../lib/AppState'
import { generateAlerts } from '../../services/alertsEngine'

export function useOperationalContext() {
  const { data } = useAppData()
  const family = data.families[0]
  const diners = data.familyMembers.filter((diner) => diner.family_id === family?.id && diner.is_active)
  const alerts = family
    ? generateAlerts({
        family,
        diners,
        allergies: data.allergies,
        ingredients: data.ingredients,
        recipes: data.recipes,
        recipeIngredients: data.recipeIngredients,
        menuItems: data.menuPlanItems,
        pantry: data.pantryInventory,
        freezer: data.freezerInventory,
        settings: data.settings,
      })
    : []
  return { data, family, diners, alerts }
}

export function useCanWrite() {
  const { profile } = useAuth()
  return profile?.role !== 'viewer'
}
