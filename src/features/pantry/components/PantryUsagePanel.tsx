import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { usePantryState } from '../hooks/usePantryState'
import { formatNumber } from '../../../lib/utils'

type PantryState = ReturnType<typeof usePantryState>

export function PantryUsagePanel({ pantry }: { pantry: PantryState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('pantry.usagePanel')}</h2>
      <p className="mt-2 text-sm text-slate-600">{t('pantry.usageBody')}</p>
      <div className="mt-4">
        {pantry.usageRows.length === 0 ? (
          <EmptyState text={t('pantry.noUpcomingUsage')} />
        ) : (
          <ResponsiveTable
            headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('portion.usedInRecipes'), t('common.status')]}
            rows={pantry.usageRows.map((row) => [
              row.ingredientName,
              `${formatNumber(row.requiredQuantity)} ${row.unit}`,
              `${formatNumber(row.availableQuantity)} ${row.unit}`,
              `${formatNumber(row.missingQuantity)} ${row.unit}`,
              row.usedInRecipes.join(', '),
              <Badge key="status" status={row.missingQuantity > 0 ? 'warning' : 'safe'}>
                {row.missingQuantity > 0 ? t('shopping.purchaseNeeded') : t('pantry.coveredByPantry')}
              </Badge>,
            ])}
          />
        )}
      </div>
    </Card>
  )
}
