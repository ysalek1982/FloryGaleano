import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber, safeDate } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function FreezerInventoryReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.freezerReport')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.recipe'), t('freezer.preparedDate'), t('freezer.expirationDate'), t('freezer.portionsAvailable'), t('freezer.gramsPerPortion'), t('recipes.reheating')]}
        rows={reports.freezerRows.map((item) => [
          reports.data.recipes.find((recipe) => recipe.id === item.recipe_id)?.name || '-',
          safeDate(item.prepared_date),
          safeDate(item.expiration_date),
          formatNumber(item.portions_available),
          `${formatNumber(item.grams_per_portion ?? 0)}g`,
          item.reheating_instructions || '-',
        ])}
      />
    </ReportPrintLayout>
  )
}
