import { CheckCircle2, ClipboardList, PackageCheck, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, MetricCard } from '../../shared/chefUi'
import type { useShoppingListState } from '../hooks/useShoppingListState'

type ShoppingState = ReturnType<typeof useShoppingListState>

export function ShoppingMissingSummary({ shopping }: { shopping: ShoppingState }) {
  const { t } = useTranslation()
  return (
    <>
      {shopping.isStale && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900" data-testid="shopping-stale-warning">
          {t('shopping.regenerateNeeded')}
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('shopping.totalRequired')} value={shopping.summary.totalRequired} icon={ClipboardList} />
        <MetricCard label={t('shopping.totalMissing')} value={shopping.summary.missing} icon={ShoppingCart} tone="warning" />
        <MetricCard label={t('shopping.coveredByPantry')} value={shopping.summary.covered} icon={PackageCheck} />
        <MetricCard label={t('shopping.pendingItems')} value={shopping.summary.pending} icon={CheckCircle2} tone={shopping.summary.pending ? 'warning' : 'default'} />
      </div>
    </>
  )
}
