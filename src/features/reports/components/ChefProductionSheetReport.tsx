import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber, safeDate } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function ChefProductionSheetReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.productionSheet')} reports={reports}>
      <div className="grid gap-5">
        <ResponsiveTable
          headers={[t('common.date'), t('common.meal'), t('common.recipe'), t('common.diner'), t('portion.servingEquivalent'), t('portion.plannedGrams')]}
          rows={reports.menuItems.map((item) => [
            safeDate(item.planned_date),
            t(`planner.${item.meal_time}`),
            reports.data.recipes.find((recipe) => recipe.id === item.recipe_id)?.name || '-',
            item.family_member_id ? reports.data.familyMembers.find((diner) => diner.id === item.family_member_id)?.full_name || '-' : reports.diners.map((diner) => diner.nickname || diner.full_name).join(', '),
            formatNumber(item.portion_factor),
            `${formatNumber(item.planned_grams ?? 0)}g`,
          ])}
        />
        <ResponsiveTable
          headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('common.unit'), t('portion.usedInRecipes'), t('portion.allergyNotes')]}
          rows={reports.productionRows.map((row) => [
            row.ingredientName,
            formatNumber(row.requiredQuantity),
            formatNumber(row.availableQuantity),
            formatNumber(row.missingQuantity),
            row.unit,
            row.usedInRecipes.join(', '),
            row.allergyNotes.join(', ') || '-',
          ])}
        />
      </div>
    </ReportPrintLayout>
  )
}
