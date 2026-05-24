import { useTranslation } from 'react-i18next'

import { Badge, Button, Card } from '../../shared/chefUi'
import type { useShoppingListState } from '../hooks/useShoppingListState'
import { formatShoppingQuantity } from '../utils/shoppingFormatters'
import { cn } from '../../../lib/utils'

type ShoppingState = ReturnType<typeof useShoppingListState>
type ShoppingRow = ShoppingState['items'][number]

export function ShoppingCategoryGroup({
  category,
  items,
  canWrite,
  onToggle,
  onEdit,
}: {
  category: string
  items: ShoppingRow[]
  canWrite: boolean
  onToggle: (itemId: string) => void
  onEdit: (itemId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{category === 'uncategorized' ? t('common.category') : category}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((row) => (
          <label key={row.item.id} className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <span>
              <input className="mr-3" type="checkbox" checked={row.item.is_checked} disabled={!canWrite} onChange={() => onToggle(row.item.id)} />
              <span className={cn('font-semibold', row.item.is_checked && 'line-through')}>{row.ingredient?.name}</span>
              {row.item.notes && <span className="ml-2 text-sm text-slate-500">{row.item.notes}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge>{t('common.required')}: {formatShoppingQuantity(row.item.required_quantity, row.item.unit)}</Badge>
              <Badge status={row.item.available_quantity ? 'safe' : 'warning'}>{t('common.available')}: {formatShoppingQuantity(row.item.available_quantity, row.item.unit)}</Badge>
              <Badge status={row.item.missing_quantity > 0 ? 'warning' : 'safe'}>{t('common.missing')}: {formatShoppingQuantity(row.item.missing_quantity, row.item.unit)}</Badge>
              {canWrite && <Button variant="ghost" onClick={(event) => { event.preventDefault(); onEdit(row.item.id) }}>{t('common.edit')}</Button>}
            </span>
          </label>
        ))}
      </div>
    </Card>
  )
}
