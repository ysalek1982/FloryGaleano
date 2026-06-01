import type { AiCopilotApplyOption, AiCopilotPageId } from '../types'

export function pageIdFromPath(pathname: string): AiCopilotPageId {
  if (pathname.includes('/families')) return 'families'
  if (pathname.includes('/diners')) return 'diners'
  if (pathname.includes('/ingredients')) return 'ingredients'
  if (pathname.includes('/recipes')) return 'recipes'
  if (pathname.includes('/menu-planner')) return 'menu_planner'
  if (pathname.includes('/day-planner')) return 'day_planner'
  if (pathname.includes('/portion-calculator')) return 'portion_calculator'
  if (pathname.includes('/shopping-list')) return 'shopping_list'
  if (pathname.includes('/pantry')) return 'pantry'
  if (pathname.includes('/freezer')) return 'freezer'
  if (pathname.includes('/allergies')) return 'allergies'
  if (pathname.includes('/nutrition')) return 'nutrition'
  if (pathname.includes('/alerts')) return 'alerts'
  if (pathname.includes('/reports')) return 'reports'
  if (pathname.includes('/settings')) return 'settings'
  return 'dashboard'
}

export function pageLabelKey(pageId: AiCopilotPageId) {
  return `aiCopilot.pages.${pageId}`
}

export function statusLabel(status?: string) {
  const normalized = status || 'review_needed'
  const labels: Record<string, string> = {
    safe: 'common.safe',
    allowed: 'common.safe',
    valid: 'common.safe',
    active: 'common.active',
    review_needed: 'common.reviewNeeded',
    warning: 'common.warning',
    blocked: 'common.blocked',
    critical: 'common.critical',
    missing: 'common.missing',
    not_configured: 'common.notConfigured',
    configured: 'common.configured',
    enabled: 'common.enabled',
    disabled: 'common.disabled',
  }
  return labels[normalized] || 'common.reviewNeeded'
}

export function applyOptionLabel(option?: AiCopilotApplyOption | string) {
  const normalized = option || 'no_apply_available'
  const labels: Record<string, string> = {
    apply_recipe_patch: 'aiCopilot.applyOptions.apply_recipe_patch',
    apply_menu_patch: 'aiCopilot.applyOptions.apply_menu_patch',
    create_shopping_item: 'aiCopilot.applyOptions.create_shopping_item',
    create_alert: 'aiCopilot.applyOptions.create_alert',
    open_settings: 'aiCopilot.applyOptions.open_settings',
    no_apply_available: 'aiCopilot.applyOptions.no_apply_available',
  }
  return labels[normalized] || labels.no_apply_available
}
