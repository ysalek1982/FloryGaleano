import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { InventoryForecast } from '../utils/inventoryForecastEngine'

function quantity(value: number, unit: string) {
  return `${Math.round(value)} ${unit}`
}

export function PurchasePriorityPanel({ forecast }: { forecast: InventoryForecast }) {
  const { t } = useTranslation()
  return (
    <Card data-testid="purchase-priority-panel">
      <h2 className="font-serif text-2xl font-semibold">{t('forecast.purchasePriority')}</h2>
      <div className="mt-4">
        {forecast.purchasePriorities.length ? (
          <ResponsiveTable
            headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('forecast.priority')]}
            rows={forecast.purchasePriorities.map((row) => [
              row.ingredient.name,
              quantity(row.requiredQuantity, row.unit),
              quantity(row.availableQuantity, row.unit),
              quantity(row.missingQuantity, row.unit),
              <Badge key={row.ingredient.id} status={row.priority === 'critical' ? 'critical' : row.priority === 'high' ? 'warning' : 'safe'}>{t(`forecast.priorities.${row.priority}`)}</Badge>,
            ])}
          />
        ) : (
          <EmptyState text={t('forecast.noPriorityItems')} />
        )}
      </div>
    </Card>
  )
}
