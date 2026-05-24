import { useTranslation } from 'react-i18next'

import { Card } from '../../shared/chefUi'
import { safeDate } from '../../../lib/utils'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayPrintSummary({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  return (
    <Card className="print:shadow-none">
      <p className="text-sm font-semibold uppercase tracking-wide text-forest-700">{t('dayPlanner.dayPlan')}</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold">{state.family?.name || t('common.family')}</h2>
      <p className="mt-1 text-sm text-slate-600">{safeDate(state.date)}</p>
    </Card>
  )
}
