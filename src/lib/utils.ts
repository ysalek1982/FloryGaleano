import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T12:00:00`).getTime()
  const to = new Date(`${toIso}T12:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}

export function currency(value?: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function uid(prefix: string) {
  void prefix
  return crypto.randomUUID()
}

export function safeDate(value?: string) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1990) return ''
  return date.toISOString().slice(0, 10)
}
