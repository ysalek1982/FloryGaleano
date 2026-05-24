import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import type { usePantryState } from '../hooks/usePantryState'

type PantryState = ReturnType<typeof usePantryState>

export function PantryCategorySummary({ pantry }: { pantry: PantryState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('pantry.categorySummary')}</h2>
      <div className="mt-4 grid gap-3">
        {pantry.categorySummary.length === 0 ? (
          <EmptyState text={t('empty.ingredients')} />
        ) : (
          pantry.categorySummary.map((category) => (
            <div key={category.name} className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-3">
              <div>
                <p className="font-semibold text-slate-900">{category.name}</p>
                <p className="text-sm text-slate-500">{category.count} {t('pantry.itemsInStock')}</p>
              </div>
              <Badge status={category.lowStock ? 'warning' : 'safe'}>{category.lowStock} {t('pantry.lowStock')}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
