import { useTranslation } from 'react-i18next'

import { EmptyState } from '../../shared/chefUi'
import { ShoppingCategoryGroup } from './ShoppingCategoryGroup'
import type { useShoppingListState } from '../hooks/useShoppingListState'

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
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map(([category, items]) => (
        <ShoppingCategoryGroup key={category} category={category} items={items} canWrite={canWrite} onToggle={onToggle} onEdit={onEdit} />
      ))}
    </div>
  )
}
