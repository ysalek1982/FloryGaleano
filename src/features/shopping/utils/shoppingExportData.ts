import type { TFunction } from 'i18next'

import type { ExportReport } from '../../exports/types'
import { createExportLabels } from '../../exports/utils/exportFormatters'
import type { useShoppingListState } from '../hooks/useShoppingListState'

type ShoppingState = ReturnType<typeof useShoppingListState>

function quantity(value: number, unit = 'g') {
  return `${Math.round(value)} ${unit}`
}

export function buildShoppingExportReport(shopping: ShoppingState, t: TFunction): ExportReport {
  const family = shopping.data.families.find((item) => item.id === shopping.familyId) || shopping.data.families[0]
  const generatedAt = new Date().toLocaleString()
  const rows = shopping.items.map((row) => ({
    [t('common.category')]: row.ingredient?.category || '',
    [t('common.ingredient')]: row.ingredient?.name || '',
    [t('common.required')]: quantity(row.item.required_quantity, row.item.unit),
    [t('common.available')]: quantity(row.item.available_quantity, row.item.unit),
    [t('common.missing')]: quantity(row.item.missing_quantity, row.item.unit),
    [t('shopping.purchased')]: row.item.is_checked ? t('common.yes') : t('common.no'),
    [t('common.notes')]: row.item.notes || '',
  }))
  const missingRows = rows.filter((row) => String(row[t('common.missing')] || '').startsWith('0') === false)

  return {
    title: t('shopping.title'),
    fileName: `${t('shopping.title')} ${family?.name || ''}`,
    familyName: family?.name || '',
    dateRange: t('common.current'),
    generatedAt,
    labels: createExportLabels(t),
    sheets: [
      {
        name: t('shopping.itemsByCategory'),
        rows,
      },
      {
        name: t('shopping.missingItems'),
        rows: missingRows,
      },
      {
        name: t('shopping.pantryComparison'),
        rows: shopping.items.map((row) => ({
          [t('common.ingredient')]: row.ingredient?.name || '',
          [t('common.required')]: quantity(row.item.required_quantity, row.item.unit),
          [t('common.available')]: quantity(row.item.available_quantity, row.item.unit),
          [t('common.missing')]: quantity(row.item.missing_quantity, row.item.unit),
        })),
      },
    ],
  }
}
