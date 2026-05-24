import { useTranslation } from 'react-i18next'

import { Card, ResponsiveTable } from '../../shared/chefUi'
import type { useShoppingListState } from '../hooks/useShoppingListState'
import { formatShoppingQuantity } from '../utils/shoppingFormatters'

type ShoppingState = ReturnType<typeof useShoppingListState>

export function PrintableShoppingList({ shopping }: { shopping: ShoppingState }) {
  const { t } = useTranslation()
  const family = shopping.data.families.find((item) => item.id === shopping.familyId) || shopping.data.families[0]
  return (
    <Card className="hidden print:block print:shadow-none">
      <p className="text-sm font-semibold uppercase tracking-wide text-forest-700">{t('reports.shoppingList')}</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold">{family?.name || t('common.family')}</h2>
      <p className="mt-2 text-sm text-slate-600">{t('reports.generatedAt')}: {new Date().toLocaleString()}</p>
      <div className="mt-4">
        <ResponsiveTable
          headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('common.status')]}
          rows={shopping.items.map((row) => [
            row.ingredient?.name || '-',
            formatShoppingQuantity(row.item.required_quantity, row.item.unit),
            formatShoppingQuantity(row.item.available_quantity, row.item.unit),
            formatShoppingQuantity(row.item.missing_quantity, row.item.unit),
            row.item.is_checked ? t('shopping.purchased') : t('shopping.pendingItems'),
          ])}
        />
      </div>
    </Card>
  )
}
