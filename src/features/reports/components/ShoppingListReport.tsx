import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function ShoppingListReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.shoppingList')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('common.status')]}
        rows={reports.shoppingItems.map((item) => {
          const ingredient = reports.data.ingredients.find((candidate) => candidate.id === item.ingredient_id)
          return [
            ingredient?.name || '-',
            `${formatNumber(item.required_quantity)} ${item.unit}`,
            `${formatNumber(item.available_quantity)} ${item.unit}`,
            `${formatNumber(item.missing_quantity)} ${item.unit}`,
            item.is_checked ? t('shopping.purchased') : t('shopping.pendingItems'),
          ]
        })}
      />
    </ReportPrintLayout>
  )
}
