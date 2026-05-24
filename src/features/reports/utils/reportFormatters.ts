import { safeDate } from '../../../lib/utils'

export function reportDateRange(start?: string, end?: string) {
  return `${safeDate(start) || '-'} - ${safeDate(end) || '-'}`
}

export function generatedTimestamp() {
  return new Date().toLocaleString()
}
