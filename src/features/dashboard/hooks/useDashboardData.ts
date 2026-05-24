import { useMemo } from 'react'

import { useOperationalContext } from '../../shared/chefHooks'
import { addDays, safeDate, todayIso } from '../../../lib/utils'
import { calculateVarietyScore } from '../../../services/menuRotationEngine'

export function useDashboardData() {
  const operational = useOperationalContext()
  const { data, diners, alerts, family } = operational

  return useMemo(() => {
    const today = todayIso()
    const todayItems = data.menuPlanItems.filter((item) => item.planned_date === today)
    const upcomingMeals = data.menuPlanItems
      .filter((item) => item.planned_date >= today)
      .sort((a, b) => `${a.planned_date}-${a.meal_time}`.localeCompare(`${b.planned_date}-${b.meal_time}`))
      .slice(0, 6)
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical')
    const missingIngredients = data.shoppingListItems.filter((item) => item.missing_quantity > 0)
    const lowStock = data.pantryInventory.filter((item) => item.quantity_available < item.min_quantity_alert)
    const freezerExpiring = data.freezerInventory.filter((item) => {
      const expirationDate = safeDate(item.expiration_date)
      return expirationDate && expirationDate <= addDays(today, 7)
    })
    const recipesReview = alerts.filter((alert) => alert.type === 'review_recipe')
    const allergyBlocks = alerts.filter((alert) => alert.type === 'blocked_recipe')
    const repeatedDishes = alerts.filter((alert) => alert.type === 'repeated_dish')
    const varietyScore = calculateVarietyScore(data.menuPlanItems, data.recipes)

    return {
      data,
      family,
      diners,
      alerts,
      today,
      todayItems,
      upcomingMeals,
      criticalAlerts,
      missingIngredients,
      lowStock,
      freezerExpiring,
      recipesReview,
      allergyBlocks,
      repeatedDishes,
      varietyScore,
      aiEnabled: data.settings.gemini_enabled,
    }
  }, [alerts, data, diners, family])
}
