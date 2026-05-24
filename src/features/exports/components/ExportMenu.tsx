import { Eye, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../shared/chefUi'
import { useExportReport } from '../hooks/useExportReport'
import type { ExportReport } from '../types'
import { ExportPreviewDialog } from './ExportPreviewDialog'

export function ExportMenu({
  report,
  allowCsv = true,
  testIdPrefix = 'export',
}: {
  report: ExportReport
  allowCsv?: boolean
  testIdPrefix?: string
}) {
  const { t } = useTranslation()
  const exportReport = useExportReport(report)
  const [previewOpen, setPreviewOpen] = useState(false)
  const disabled = exportReport.status === 'generating'

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportReport.print} disabled={disabled} data-testid={`${testIdPrefix}-print`}>
          <Printer className="h-4 w-4" />
          {t('common.print')}
        </Button>
        <Button variant="secondary" onClick={exportReport.exportPdf} disabled={disabled} data-testid={`${testIdPrefix}-pdf`}>
          <FileText className="h-4 w-4" />
          {t('exports.pdf')}
        </Button>
        <Button variant="secondary" onClick={exportReport.exportExcel} disabled={disabled} data-testid={`${testIdPrefix}-excel`}>
          <FileSpreadsheet className="h-4 w-4" />
          {t('exports.excel')}
        </Button>
        {allowCsv && (
          <Button variant="secondary" onClick={exportReport.exportCsv} disabled={disabled} data-testid={`${testIdPrefix}-csv`}>
            <FileText className="h-4 w-4" />
            {t('exports.csv')}
          </Button>
        )}
        <Button variant="ghost" onClick={() => setPreviewOpen(true)} data-testid={`${testIdPrefix}-preview`}>
          <Eye className="h-4 w-4" />
          {t('exports.preview')}
        </Button>
      </div>
      {exportReport.message && (
        <p className="text-sm text-slate-600" role="status" data-testid={`${testIdPrefix}-status`}>
          {exportReport.message}
        </p>
      )}
      {previewOpen && <ExportPreviewDialog report={report} onClose={() => setPreviewOpen(false)} />}
    </div>
  )
}
