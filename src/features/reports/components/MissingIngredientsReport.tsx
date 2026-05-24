import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function MissingIngredientsReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.missingIngredients')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('portion.usedInRecipes')]}
        rows={reports.missingRows.map((row) => [
          row.ingredientName,
          `${formatNumber(row.requiredQuantity)} ${row.unit}`,
          `${formatNumber(row.availableQuantity)} ${row.unit}`,
          `${formatNumber(row.missingQuantity)} ${row.unit}`,
          row.usedInRecipes.join(', '),
        ])}
      />
    </ReportPrintLayout>
  )
}
