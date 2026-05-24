import type { SheetData } from 'write-excel-file/browser'
import type { ExportReport, ExportRow } from '../types'
import { formatExportCell, getExportLabels, normalizeSheetName, safeExportFileName, withSummarySheet } from './exportFormatters'
import type { ExportLabels } from '../types'

function rowsToSheetData(rows: ExportRow[], labels: ExportLabels): SheetData {
  if (!rows.length) {
    return [
      [{ value: labels.status, fontWeight: 'bold', backgroundColor: '#ecfdf5' }],
      [labels.noRows],
    ]
  }

  const headers = Array.from(
    rows.reduce<Set<string>>((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key))
      return keys
    }, new Set()),
  )

  return [
    headers.map((header) => ({ value: header, fontWeight: 'bold', backgroundColor: '#ecfdf5' })),
    ...rows.map((row) => headers.map((header) => formatExportCell(row[header], labels))),
  ]
}

export async function exportReportToExcel(report: ExportReport) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const labels = getExportLabels(report)
  await writeXlsxFile(
    withSummarySheet(report).map((sheet) => ({
      sheet: normalizeSheetName(sheet.name),
      data: rowsToSheetData(sheet.rows, labels),
    })),
    { fontFamily: 'Inter', fontSize: 11 },
  ).toFile(`${safeExportFileName(report.fileName)}.xlsx`)
}
