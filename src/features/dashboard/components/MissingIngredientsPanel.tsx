import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function MissingIngredientsPanel({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.missingIngredients')}</h2>
      <div className="mt-4 grid gap-3">
        {dashboard.missingIngredients.length === 0 ? (
          <EmptyState text={t('dashboard.noMissingIngredients')} />
        ) : (
          dashboard.missingIngredients.slice(0, 5).map((item) => {
            const ingredient = dashboard.data.ingredients.find((candidate) => candidate.id === item.ingredient_id)
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
                <span className="font-semibold text-slate-900">{ingredient?.name || t('common.ingredient')}</span>
                <Badge status="warning">{formatNumber(item.missing_quantity)} {item.unit}</Badge>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
