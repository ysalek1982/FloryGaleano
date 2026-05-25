export type AiCopilotPageId =
  | 'dashboard'
  | 'families'
  | 'diners'
  | 'ingredients'
  | 'recipes'
  | 'menu_planner'
  | 'day_planner'
  | 'portion_calculator'
  | 'shopping_list'
  | 'pantry'
  | 'freezer'
  | 'allergies'
  | 'nutrition'
  | 'alerts'
  | 'reports'
  | 'settings'

export type AiCopilotApplyOption =
  | 'apply_recipe_patch'
  | 'apply_menu_patch'
  | 'create_shopping_item'
  | 'create_alert'
  | 'open_settings'
  | 'no_apply_available'

export type AiCopilotStatus = 'safe' | 'review_needed' | 'blocked'

export interface AiCopilotPageContext {
  page_id: AiCopilotPageId
  selected_family_id?: string
  selected_date?: string
  selected_week?: string
  selected_recipe_id?: string
  selected_ingredient_id?: string
  selected_menu_plan_id?: string
  selected_diner_ids?: string[]
  relevant_records?: Record<string, unknown>
}

export interface AiCopilotActionDefinition {
  key: string
  labelKey: string
  descriptionKey: string
  edgeAction: string
  pageIds: AiCopilotPageId[]
  icon?: 'brain' | 'sparkles' | 'shield' | 'shopping' | 'inventory' | 'report' | 'settings'
}

export interface AiCopilotSuggestion {
  id?: string
  type?: string
  title?: string
  reason?: string
  status?: AiCopilotStatus
  safety_status?: AiCopilotStatus
  confidence?: number
  warnings?: string[]
  data?: Record<string, unknown>
  apply_option?: AiCopilotApplyOption
  recipe_id?: string | null
  planned_date?: string | null
  meal_time?: string | null
  safety_notes?: string[]
  rotation_status?: string
  nutrition_status?: string
  inventory_status?: string
}

export interface AiCopilotResponse {
  status?: AiCopilotStatus
  page_id?: string
  action?: string
  title?: string
  summary?: string
  suggestions?: AiCopilotSuggestion[]
  warnings?: string[]
  validation_summary?: {
    status?: AiCopilotStatus
    reasons?: string[]
    warnings?: string[]
  }
  apply_options?: AiCopilotApplyOption[]
  code?: string
  message?: string
  suggested_action?: string
  retry_after_seconds?: number | null
}
