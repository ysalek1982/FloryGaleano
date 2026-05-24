import { useTranslation } from 'react-i18next'

import { Card } from '../../shared/chefUi'
import type { InventoryForecast } from '../utils/inventoryForecastEngine'

export function InventoryForecastPanel({ forecast }: { forecast: InventoryForecast }) {
  const { t } = useTranslation()
  const stats = [
    { label: t('forecast.expiringSoon'), value: forecast.pantryExpiringSoon.length + forecast.freezerExpiringSoon.length },
    { label: t('forecast.lowStock'), value: forecast.pantryLowStock.length },
    { label: t('forecast.missingRequired'), value: forecast.purchasePriorities.filter((row) => row.missingQuantity > 0).length },
    { label: t('forecast.coveredByPantry'), value: forecast.coveredByPantry.length },
  ]
  return (
    <Card data-testid="inventory-forecast-panel">
      <h2 className="font-serif text-2xl font-semibold">{t('forecast.title')}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
