import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function NutritionSummaryReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.nutritionReport')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.recipe'), t('common.calories'), t('common.protein'), t('common.carbs'), t('common.fat'), t('common.status')]}
        rows={reports.nutritionRows.map((row) => [
          row.recipe.name,
          formatNumber(row.nutrition.calories_per_serving),
          `${formatNumber(row.nutrition.protein_g_per_serving)}g`,
          `${formatNumber(row.nutrition.carbs_g_per_serving)}g`,
          `${formatNumber(row.nutrition.fat_g_per_serving)}g`,
          row.nutrition.missing_nutrition ? t('recipes.missingData') : t('nutrition.adequate'),
        ])}
      />
    </ReportPrintLayout>
  )
}
