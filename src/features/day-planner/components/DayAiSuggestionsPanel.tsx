import { useTranslation } from 'react-i18next'

import { Badge, Button, Card, EmptyState } from '../../shared/chefUi'
import type { MealTime } from '../../../lib/types'
import type { DayAiSuggestion, useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayAiSuggestionsPanel({
  state,
  onApply,
}: {
  state: DayPlannerState
  onApply: (suggestion: DayAiSuggestion) => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.aiSuggestions')}</h2>
      <div className="mt-4 grid gap-3">
        {state.aiSuggestions.length === 0 ? (
          <EmptyState text={t('dayPlanner.noAiSuggestions')} />
        ) : (
          state.aiSuggestions.map((suggestion, index) => {
            const status = suggestion.safety_status || 'review_needed'
            const canApply = status === 'safe' && suggestion.usable === true
            return (
              <div key={`${suggestion.title}-${index}`} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{suggestion.title || t('nav.aiChef')}</p>
                    <p className="mt-1 text-sm text-slate-600">{suggestion.ingredients?.join(', ') || t(`planner.${suggestion.meal_time || 'dinner' as MealTime}`)}</p>
                  </div>
                  <Badge status={status}>{t(status === 'review_needed' ? 'common.reviewNeeded' : `common.${status}`)}</Badge>
                </div>
                <Button className="mt-3" variant="secondary" disabled={!canApply} onClick={() => onApply(suggestion)}>
                  {status === 'blocked' ? t('dayPlanner.blockedSuggestion') : status === 'review_needed' ? t('dayPlanner.reviewRequired') : t('ai.applySuggestion')}
                </Button>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
