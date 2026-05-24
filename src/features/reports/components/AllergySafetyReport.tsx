import { useTranslation } from 'react-i18next'

import { ResponsiveTable } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'
import { ReportPrintLayout } from './ReportPrintLayout'

type ReportsData = ReturnType<typeof useReportsData>

export function AllergySafetyReport({ reports }: { reports: ReportsData }) {
  const { t } = useTranslation()
  return (
    <ReportPrintLayout title={t('reports.allergyReport')} reports={reports}>
      <ResponsiveTable
        headers={[t('common.diner'), t('common.ingredient'), t('allergies.severity'), t('allergies.avoidTraces'), t('allergies.crossContactRisk')]}
        rows={reports.allergies.map((allergy) => [
          reports.data.familyMembers.find((diner) => diner.id === allergy.family_member_id)?.full_name || '-',
          allergy.allergen_name,
          t(`allergies.${allergy.severity}`),
          allergy.avoid_traces ? t('common.enabled') : t('common.disabled'),
          allergy.cross_contact_risk ? t('common.enabled') : t('common.disabled'),
        ])}
      />
    </ReportPrintLayout>
  )
}
