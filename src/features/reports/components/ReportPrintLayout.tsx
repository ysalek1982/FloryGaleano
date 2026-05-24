import { useTranslation } from 'react-i18next'
import type React from 'react'

import { Card } from '../../shared/chefUi'
import type { useReportsData } from '../hooks/useReportsData'

type ReportsData = ReturnType<typeof useReportsData>

export function ReportPrintLayout({
  title,
  reports,
  children,
}: {
  title: string
  reports: ReportsData
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Card className="print:mb-6 print:break-inside-avoid print:shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-forest-700">{title}</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">{reports.family?.name || t('common.family')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('portion.dateRange')}: {reports.dateRange}</p>
        </div>
        <p className="text-sm text-slate-600">{t('reports.generatedAt')}: {reports.generatedAt}</p>
      </div>
      {children}
    </Card>
  )
}
