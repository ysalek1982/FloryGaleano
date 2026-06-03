import { useTranslation } from 'react-i18next'

import { Button, Dialog, ResponsiveTable } from '../../shared/chefUi'
import type { ExportReport } from '../types'
import { countExportRows } from '../utils/exportFormatters'

export function ExportPreviewDialog({ report, onClose }: { report: ExportReport; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog title={t('exports.preview')} onClose={onClose}>
      <div className="grid gap-4">
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        </div>
        <div className="rounded-md bg-stone-50 p-3 text-sm text-slate-700">
          <p><strong>{t('reports.reportTitle')}:</strong> {report.title}</p>
          <p><strong>{t('common.family')}:</strong> {report.familyName}</p>
          <p><strong>{t('reports.generatedAt')}:</strong> {report.generatedAt}</p>
          <p><strong>{t('exports.rows')}:</strong> {countExportRows(report)}</p>
        </div>
        <ResponsiveTable
          headers={[t('exports.sheet'), t('exports.rows')]}
          rows={report.sheets.map((sheet) => [sheet.name, sheet.rows.length])}
        />
      </div>
    </Dialog>
  )
}
