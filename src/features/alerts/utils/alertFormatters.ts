import type { Alert } from '../../../lib/types'

export const alertSeverityOrder: Record<Alert['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export function alertTypeKey(type: string) {
  const map: Record<string, string> = {
    missing_ingredient: 'alerts.types.missing_ingredient',
    low_stock: 'alerts.types.low_stock',
    blocked_recipe: 'alerts.types.allergy_blocked',
    allergy_blocked: 'alerts.types.allergy_blocked',
    review_recipe: 'alerts.types.allergy_review',
    allergy_review: 'alerts.types.allergy_review',
    low_calories: 'alerts.types.low_calories',
    low_protein: 'alerts.types.low_protein',
    repeated_dish: 'alerts.types.repeated_recipe',
    repeated_recipe: 'alerts.types.repeated_recipe',
    freezer_expiring: 'alerts.types.freezer_expiring',
    missing_nutrition: 'alerts.types.missing_nutrition_data',
    missing_nutrition_data: 'alerts.types.missing_nutrition_data',
    unassigned_slot: 'alerts.types.unassigned_meal',
    unassigned_meal: 'alerts.types.unassigned_meal',
    freezer_low: 'alerts.types.freezer_low',
    diner_profile_incomplete: 'alerts.types.diner_profile_incomplete',
    ai_safety_review: 'alerts.types.ai_safety_review',
  }
  return map[type] || 'alerts.types.operational'
}

export function alertResolutionKey(type: string) {
  if (type.includes('ingredient') || type === 'low_stock') return 'alerts.resolutions.inventory'
  if (type.includes('allergy') || type.includes('recipe') || type === 'blocked_recipe' || type === 'review_recipe') return 'alerts.resolutions.safety'
  if (type.includes('calories') || type.includes('protein')) return 'alerts.resolutions.nutrition'
  if (type.includes('freezer')) return 'alerts.resolutions.freezer'
  if (type.includes('unassigned')) return 'alerts.resolutions.planning'
  return 'alerts.resolutions.review'
}
