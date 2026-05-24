import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { formatNumber, safeDate } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function WeeklyFamilyMenuReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.weeklyMenu')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.date'), t('common.meal'), t('common.recipe'), t('common.diner'), t('common.calories'), t('common.protein'), t('common.status')]}
        rows={reports.menuItems.map((item) => [
          safeDate(item.planned_date),
          t(`planner.${item.meal_time}`),
          reports.data.recipes.find((recipe) => recipe.id === item.recipe_id)?.name || '-',
          item.family_member_id ? reports.data.familyMembers.find((diner) => diner.id === item.family_member_id)?.full_name || '-' : t('planner.assignAll'),
          formatNumber(item.calories ?? 0),
          `${formatNumber(item.protein_g ?? 0)}g`,
          t(item.allergy_status === 'review_needed' ? 'common.reviewNeeded' : `common.${item.allergy_status}`),
        ])}
      />
    </ReportPrintLayout>
  )
}
