import type { AiKeyStatus } from '../../settings/hooks/useAiConnectionTest'
import type { AiCopilotSuggestion } from '../types'

export function getCopilotAvailability(status: AiKeyStatus) {
  if (status.key_status === 'rate_limited') {
    return {
      badgeKey: 'aiCopilot.badges.rateLimited',
      tone: 'warning' as const,
      canRun: !isCooldownActive(status),
    }
  }
  if (status.configured && status.key_status === 'valid') {
    return {
      badgeKey: 'aiCopilot.badges.ready',
      tone: 'safe' as const,
      canRun: true,
    }
  }
  if (status.key_status === 'invalid' || status.key_status === 'test_failed') {
    return {
      badgeKey: 'aiCopilot.badges.reviewNeeded',
      tone: 'blocked' as const,
      canRun: false,
    }
  }
  return {
    badgeKey: 'aiCopilot.badges.setupNeeded',
    tone: 'warning' as const,
    canRun: false,
  }
}

export function isCooldownActive(status: AiKeyStatus) {
  return status.key_status === 'rate_limited' && Number(status.retry_after_seconds || 0) > 0
}

export function suggestionStatus(suggestion: AiCopilotSuggestion) {
  return suggestion.status || suggestion.safety_status || 'review_needed'
}

export function canApplyCopilotSuggestion(suggestion: AiCopilotSuggestion, canWrite: boolean) {
  if (!canWrite) return false
  const status = suggestionStatus(suggestion)
  if (status === 'blocked') return false
  if (!suggestion.apply_option || suggestion.apply_option === 'no_apply_available') return false
  if (suggestion.apply_option === 'open_settings') return true
  if (!suggestion.data || typeof suggestion.data !== 'object') return false
  if (suggestion.apply_option === 'apply_menu_patch') {
    return Boolean(suggestion.data.recipe_id && suggestion.data.planned_date && suggestion.data.meal_time)
  }
  if (suggestion.apply_option === 'create_shopping_item') {
    return Boolean(suggestion.data.ingredient_id && suggestion.data.quantity)
  }
  if (suggestion.apply_option === 'apply_recipe_patch') {
    return Boolean(suggestion.data.recipe_id || suggestion.data.recipe_payload)
  }
  return suggestion.apply_option === 'create_alert'
}
