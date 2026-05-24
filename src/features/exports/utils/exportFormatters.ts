import type { TFunction } from 'i18next'

import type { ExportCell, ExportLabels, ExportReport, ExportRow, ExportSheet } from '../types'

const fallbackLabels: ExportLabels = {
  summary: 'Summary',
  field: 'Field',
  value: 'Value',
  report: 'Report',
  family: 'Family',
  dateRange: 'Date Range',
  generatedAt: 'Generated At',
  status: 'Status',
  noRows: 'No rows',
  yes: 'Yes',
  no: 'No',
}

export function safeExportFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export function getExportLabels(report: ExportReport) {
  return { ...fallbackLabels, ...report.labels }
}

export function createExportLabels(t: TFunction): ExportLabels {
  return {
    summary: t('exports.summary'),
    field: t('exports.field'),
    value: t('exports.value'),
    report: t('exports.report'),
    family: t('common.family'),
    dateRange: t('exports.dateRange'),
    generatedAt: t('reports.generatedAt'),
    status: t('common.status'),
    noRows: t('exports.noRows'),
    yes: t('common.yes'),
    no: t('common.no'),
  }
}

export function formatExportCell(value: ExportCell, labels: ExportLabels = fallbackLabels) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? labels.yes : labels.no
  return value
}

export function normalizeSheetName(value: string) {
  const cleaned = value.replace(/[\\/?*[\]:]/g, ' ').trim()
  return (cleaned || 'Sheet').slice(0, 31)
}

export function reportSummaryRows(report: ExportReport): ExportRow[] {
  const labels = getExportLabels(report)
  return [
    { [labels.field]: labels.report, [labels.value]: report.title },
    { [labels.field]: labels.family, [labels.value]: report.familyName },
    { [labels.field]: labels.dateRange, [labels.value]: report.dateRange },
    { [labels.field]: labels.generatedAt, [labels.value]: report.generatedAt },
  ]
}

export function withSummarySheet(report: ExportReport): ExportSheet[] {
  const labels = getExportLabels(report)
  return [
    { name: labels.summary, rows: reportSummaryRows(report) },
    ...report.sheets,
  ]
}

export function countExportRows(report: ExportReport) {
  return report.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)
}
