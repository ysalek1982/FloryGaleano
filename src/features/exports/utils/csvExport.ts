import type { ExportLabels, ExportReport, ExportRow } from '../types'
import { formatExportCell, getExportLabels, safeExportFileName } from './exportFormatters'

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function rowsToCsv(rows: ExportRow[], labels: ExportLabels) {
  if (!rows.length) return `${escapeCsv(labels.status)}\n${escapeCsv(labels.noRows)}`
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key))
    return set
  }, new Set<string>()))
  return [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(formatExportCell(row[header], labels))).join(',')),
  ].join('\n')
}

export function exportReportToCsv(report: ExportReport) {
  const labels = getExportLabels(report)
  const content = report.sheets.map((sheet) => `# ${sheet.name}\n${rowsToCsv(sheet.rows, labels)}`).join('\n\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeExportFileName(report.fileName)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
