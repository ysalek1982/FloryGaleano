import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ExportReport, ExportStatus } from '../types'
import { exportReportToCsv } from '../utils/csvExport'
import { exportReportToPdf } from '../utils/pdfExport'
import { printCurrentReport } from '../utils/printExport'

export function useExportReport(report: ExportReport) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [message, setMessage] = useState('')

  const run = async (task: () => Promise<void> | void, successKey: string) => {
    setStatus('generating')
    setMessage(t('exports.generating'))
    try {
      await task()
      setStatus('success')
      setMessage(t(successKey))
    } catch {
      setStatus('error')
      setMessage(t('exports.error'))
    }
  }

  return {
    status,
    message,
    exportExcel: () => run(async () => {
      const { exportReportToExcel } = await import('../utils/excelExport')
      await exportReportToExcel(report)
    }, 'exports.excelSuccess'),
    exportCsv: () => run(() => exportReportToCsv(report), 'exports.csvSuccess'),
    exportPdf: () => run(() => exportReportToPdf(), 'exports.pdfReady'),
    print: () => run(() => printCurrentReport(), 'exports.printReady'),
  }
}
