import { useTranslation } from 'react-i18next'

import { Badge, Button, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import { ShoppingCategoryGroup } from './ShoppingCategoryGroup'
import type { useShoppingListState } from '../hooks/useShoppingListState'
import { formatShoppingQuantity } from '../utils/shoppingFormatters'

type ShoppingState = ReturnType<typeof useShoppingListState>

export function ShoppingListTable({
  shopping,
  canWrite,
  onToggle,
  onEdit,
}: {
  shopping: ShoppingState
  canWrite: boolean
  onToggle: (itemId: string) => void
  onEdit: (itemId: string) => void
}) {
  const { t } = useTranslation()
  const groups = Object.entries(shopping.grouped)
  if (groups.length === 0) return <EmptyState text={t('empty.ingredients')} />
  return (
    <div className="grid gap-5">
      <ResponsiveTable
        caption={t('shopping.title')}
        compact
        headers={[
          t('common.category'),
          t('common.ingredient'),
          t('common.required'),
          t('common.available'),
          t('common.missing'),
          t('common.status'),
          t('common.actions'),
        ]}
        rows={shopping.items.map((row) => [
          row.ingredient?.category || t('common.category'),
          <span key="ingredient" className={row.item.is_checked ? 'font-semibold text-slate-500 line-through' : 'font-semibold text-slate-950'}>{row.ingredient?.name || '-'}</span>,
          formatShoppingQuantity(row.item.required_quantity, row.item.unit),
          <Badge key="available" status={row.item.available_quantity ? 'safe' : 'warning'}>{formatShoppingQuantity(row.item.available_quantity, row.item.unit)}</Badge>,
          <Badge key="missing" status={row.item.missing_quantity > 0 ? 'warning' : 'safe'}>{formatShoppingQuantity(row.item.missing_quantity, row.item.unit)}</Badge>,
          <Badge key="status" status={row.item.is_checked ? 'safe' : row.item.missing_quantity > 0 ? 'warning' : 'active'}>{row.item.is_checked ? t('common.completed') : row.item.missing_quantity > 0 ? t('common.missing') : t('common.active')}</Badge>,
          canWrite ? (
            <div key="actions" className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onToggle(row.item.id)}>{row.item.is_checked ? t('common.active') : t('common.completed')}</Button>
              <Button variant="ghost" onClick={() => onEdit(row.item.id)}>{t('common.edit')}</Button>
            </div>
          ) : '-',
        ])}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map(([category, items]) => (
          <ShoppingCategoryGroup key={category} category={category} items={items} canWrite={canWrite} onToggle={onToggle} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}
