import { useTranslation } from 'react-i18next'

import { ExportMenu } from '../../exports/components/ExportMenu'
import { Button, Card, Field } from '../../shared/chefUi'
import type { ReportType, useReportsData } from '../hooks/useReportsData'
import { buildReportExport } from '../utils/reportExportData'

type ReportsData = ReturnType<typeof useReportsData>

const reportTypes: ReportType[] = ['all', 'weeklyMenu', 'dinerMenu', 'productionSheet', 'shoppingList', 'missingIngredients', 'allergyReport', 'nutritionReport', 'freezerReport', 'pantryLow']

export function ReportToolbar({ reports, onPrint }: { reports: ReportsData; onPrint: () => void }) {
  const { t } = useTranslation()
  const exportReport = buildReportExport(reports, t)
  return (
    <Card className="mb-5 print:hidden">
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
        <Field label={t('common.family')}>
          <select className="input" value={reports.familyId} onChange={(event) => reports.setFamilyId(event.target.value)} data-testid="reports-family">
            {reports.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
        <Field label={t('reports.reportType')}>
          <select className="input" value={reports.reportType} onChange={(event) => reports.setReportType(event.target.value as ReportType)} data-testid="reports-type">
            {reportTypes.map((type) => <option key={type} value={type}>{t(`reports.types.${type}`)}</option>)}
          </select>
        </Field>
        <div className="grid gap-2">
          <ExportMenu report={exportReport} testIdPrefix="reports-export" />
          <Button variant="ghost" className="sr-only" onClick={onPrint}>{t('common.print')}</Button>
        </div>
      </div>
    </Card>
  )
}
