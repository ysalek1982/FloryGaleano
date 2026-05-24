import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayMissingIngredientsPanel({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  const missing = state.productionRows.filter((row) => row.missingQuantity > 0)
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.missingIngredients')}</h2>
      <div className="mt-4 grid gap-3">
        {missing.length === 0 ? (
          <EmptyState text={t('dashboard.noMissingIngredients')} />
        ) : (
          missing.map((row) => (
            <div key={row.ingredientId} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
              <span className="font-semibold text-slate-900">{row.ingredientName}</span>
              <Badge status="warning">{formatNumber(row.missingQuantity)} {row.unit}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
