import { Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, Card, Field } from '../../shared/chefUi'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'
import { CompleteDayWithAiButton } from './CompleteDayWithAiButton'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayPlannerToolbar({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-end">
        <Field label={t('planner.selectFamily')}>
          <select className="input" value={state.familyId} onChange={(event) => state.setFamilyId(event.target.value)} data-testid="day-family">
            {state.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
        <Field label={t('common.date')}>
          <input className="input" type="date" value={state.date} onChange={(event) => state.setDate(event.target.value)} data-testid="day-date" />
        </Field>
        <CompleteDayWithAiButton state={state} />
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t('dayPlanner.printDayPlan')}
        </Button>
      </div>
    </Card>
  )
}
