import { useTranslation } from 'react-i18next'

import { Card, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { useShoppingListState } from '../hooks/useShoppingListState'
import { formatShoppingQuantity } from '../utils/shoppingFormatters'

type ShoppingState = ReturnType<typeof useShoppingListState>

export function ShoppingPantryComparison({ shopping }: { shopping: ShoppingState }) {
  const { t } = useTranslation()
  const rows = shopping.items.filter((row) => row.item.available_quantity > 0 || row.item.missing_quantity > 0)
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('shopping.pantryComparison')}</h2>
      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState text={t('shopping.noPantryComparison')} />
        ) : (
          <ResponsiveTable
            headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing')]}
            rows={rows.map((row) => [
              row.ingredient?.name || '-',
              formatShoppingQuantity(row.item.required_quantity, row.item.unit),
              formatShoppingQuantity(row.item.available_quantity, row.item.unit),
              formatShoppingQuantity(row.item.missing_quantity, row.item.unit),
            ])}
          />
        )}
      </div>
    </Card>
  )
}
