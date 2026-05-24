import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber, safeDate } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function PantryLowStockReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.pantryLow')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.ingredient'), t('common.available'), t('pantry.minimumAlert'), t('pantry.expirationDate'), t('pantry.location')]}
        rows={reports.lowStock.map((item) => [
          reports.data.ingredients.find((ingredient) => ingredient.id === item.ingredient_id)?.name || '-',
          `${formatNumber(item.quantity_available)} ${item.unit}`,
          `${formatNumber(item.min_quantity_alert)} ${item.unit}`,
          safeDate(item.expiration_date),
          item.location || '-',
        ])}
      />
    </ReportPrintLayout>
  )
}
