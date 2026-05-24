import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, SimpleList } from '../../shared/chefUi'
import type { usePantryState } from '../hooks/usePantryState'
import { formatPantryQuantity } from '../utils/pantryFormatters'

type PantryState = ReturnType<typeof usePantryState>

export function PantryLowStockPanel({ pantry }: { pantry: PantryState }) {
  const { t } = useTranslation()
  const items = pantry.lowStockRows.map((item) => {
    const ingredient = pantry.data.ingredients.find((candidate) => candidate.id === item.ingredient_id)
    return `${ingredient?.name || '-'} - ${formatPantryQuantity(item.quantity_available, item.unit)} / ${formatPantryQuantity(item.min_quantity_alert, item.unit)}`
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('pantry.lowStockPanel')}</h2>
        <Badge status={items.length ? 'warning' : 'safe'}>{items.length}</Badge>
      </div>
      <div className="mt-4">
        {items.length ? <SimpleList items={items} /> : <EmptyState text={t('pantry.noLowStock')} />}
      </div>
    </Card>
  )
}
