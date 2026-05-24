import { Brain } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../shared/chefUi'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function CompleteDayWithAiButton({ state }: { state: DayPlannerState }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    state.setError('')
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.functions.invoke('ai-chef', {
          body: { action: 'generate_day_menu', family_id: state.familyId, planned_date: state.date, language: i18n.language },
        })
        if (error) throw error
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
        state.setAiSuggestions(suggestions)
      } else {
        state.setAiSuggestions([{ title: t('ai.localSuggestion'), safety_status: 'safe', usable: true, meal_time: 'dinner' }])
      }
    } catch {
      state.setError(t('settings.connectionFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ai" onClick={run} disabled={loading}>
      <Brain className="h-4 w-4" />
      {loading ? t('common.loading') : t('dayPlanner.completeDayWithAi')}
    </Button>
  )
}
