import type { AiCopilotPageId } from '../types'

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
