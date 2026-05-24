import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'
import { safeDate } from '../../../lib/utils'

type ReportsData = ReturnType<typeof useReportsData>

export function DinerMenuReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.dinerMenu')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.diner'), t('common.date'), t('common.meal'), t('common.recipe'), t('common.status')]}
        rows={reports.menuItems.flatMap((item) => {
          const diners = item.family_member_id
            ? reports.diners.filter((diner) => diner.id === item.family_member_id)
            : reports.diners
          return diners.map((diner) => [
            diner.nickname || diner.full_name,
            safeDate(item.planned_date),
            t(`planner.${item.meal_time}`),
            reports.data.recipes.find((recipe) => recipe.id === item.recipe_id)?.name || '-',
            t(item.allergy_status === 'review_needed' ? 'common.reviewNeeded' : `common.${item.allergy_status}`),
          ])
        })}
      />
    </ReportPrintLayout>
  )
}
