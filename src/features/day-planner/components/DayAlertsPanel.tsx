import { useTranslation } from 'react-i18next'

import { AlertList, Card } from '../../shared/chefUi'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayAlertsPanel({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.alerts')}</h2>
      <AlertList alerts={state.alerts.slice(0, 6)} />
    </Card>
  )
}
