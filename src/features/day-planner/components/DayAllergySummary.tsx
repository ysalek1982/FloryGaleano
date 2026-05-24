import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayAllergySummary({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  const blocked = state.dayItems.filter((item) => item.allergy_status === 'blocked')
  const review = state.dayItems.filter((item) => item.allergy_status === 'review_needed')
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.allergySummary')}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge status={blocked.length ? 'blocked' : 'safe'}>{t('common.blocked')}: {blocked.length}</Badge>
        <Badge status={review.length ? 'warning' : 'safe'}>{t('common.reviewNeeded')}: {review.length}</Badge>
      </div>
      {blocked.length === 0 && review.length === 0 && <div className="mt-4"><EmptyState text={t('dayPlanner.noSafetyIssues')} /></div>}
    </Card>
  )
}
