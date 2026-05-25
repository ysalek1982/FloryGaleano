import { describe, expect, it } from 'vitest'

import { getAiCopilotActions } from '../features/ai-copilot/utils/aiCopilotRegistry'
import { canApplyCopilotSuggestion, getCopilotAvailability } from '../features/ai-copilot/utils/aiCopilotGuards'
import type { AiKeyStatus } from '../features/settings/hooks/useAiConnectionTest'

const validStatus: AiKeyStatus = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  is_enabled: true,
  configured: true,
  key_status: 'valid',
  key_last4: '1234',
  last_tested_at: null,
  last_error: null,
}

describe('AI Copilot', () => {
  it('returns contextual actions for workflow pages', () => {
    expect(getAiCopilotActions('recipes').map((action) => action.key)).toContain('recipes.checkSafety')
    expect(getAiCopilotActions('menu_planner').map((action) => action.key)).toContain('menuPlanner.repairUnsafe')
    expect(getAiCopilotActions('pantry').map((action) => action.key)).toContain('pantry.usePantry')
  })

  it('blocks AI actions while rate limited cooldown is active', () => {
    const availability = getCopilotAvailability({
      ...validStatus,
      configured: false,
      key_status: 'rate_limited',
      retry_after_seconds: 90,
    })
    expect(availability.canRun).toBe(false)
    expect(availability.badgeKey).toBe('aiCopilot.badges.rateLimited')
  })

  it('requires structured payload before applying suggestions', () => {
    expect(canApplyCopilotSuggestion({ status: 'safe', apply_option: 'apply_menu_patch', data: {} }, true)).toBe(false)
    expect(canApplyCopilotSuggestion({ status: 'safe', apply_option: 'apply_menu_patch', data: { recipe_id: 'recipe-1', planned_date: '2026-05-24', meal_time: 'dinner' } }, true)).toBe(true)
    expect(canApplyCopilotSuggestion({ status: 'blocked', apply_option: 'apply_menu_patch', data: { recipe_id: 'recipe-1', planned_date: '2026-05-24', meal_time: 'dinner' } }, true)).toBe(false)
  })
})
