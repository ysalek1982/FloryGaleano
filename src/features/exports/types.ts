export type ExportCell = string | number | boolean | null | undefined

export type ExportRow = Record<string, ExportCell>

export interface ExportSheet {
  name: string
  rows: ExportRow[]
}

export interface ExportLabels {
  summary: string
  field: string
  value: string
  report: string
  family: string
  dateRange: string
  generatedAt: string
  status: string
  noRows: string
  yes: string
  no: string
}

export interface ExportReport {
  title: string
  fileName: string
  familyName: string
  dateRange: string
  generatedAt: string
  sheets: ExportSheet[]
  labels?: ExportLabels
}

export type ExportStatus = 'idle' | 'generating' | 'success' | 'error'
