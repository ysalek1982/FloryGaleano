import { XCircle } from 'lucide-react'
import type React from 'react'
import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppData } from '../../lib/AppState'
import type { Alert, AllergyStatus, MealTime } from '../../lib/types'
import { cn, formatNumber, safeDate, todayIso } from '../../lib/utils'
import { validateRecipeForFamily } from '../../services/allergyShield'
import { calculateRecipeNutrition } from '../../services/nutritionEngine'
import { useOperationalContext } from './chefHooks'

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold shadow-sm transition focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-forest-900 text-white shadow-forest-900/15 hover:-translate-y-0.5 hover:bg-forest-700',
        variant === 'secondary' && 'border border-stone-300 bg-white/95 text-slate-800 hover:-translate-y-0.5 hover:border-forest-200 hover:bg-forest-50',
        variant === 'ghost' && 'text-slate-700 shadow-none hover:bg-stone-100/80',
        variant === 'danger' && 'bg-danger-600 text-white shadow-danger-600/15 hover:-translate-y-0.5 hover:bg-danger-700',
        variant === 'ai' && 'bg-ai-700 text-white shadow-ai-700/15 hover:-translate-y-0.5 hover:bg-ai-600',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({ status, children }: { status?: string; children: React.ReactNode }) {
  const style =
    status === 'blocked' || status === 'critical'
      ? 'border-danger-100 bg-danger-50 text-danger-700'
      : status === 'review_needed' || status === 'warning'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : status === 'safe' || status === 'active' || status === 'allowed'
          ? 'border-forest-100 bg-forest-50 text-forest-700'
          : status === 'ai'
            ? 'border-ai-100 bg-ai-50 text-ai-700'
            : 'border-stone-200 bg-stone-50 text-slate-700'
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm', style)}>{children}</span>
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-stone-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="relative">
        <div className="mb-3 h-1 w-16 rounded-full bg-gradient-to-r from-copper-500 via-saffron-500 to-forest-600" aria-hidden="true" />
        <h1 className="font-serif text-4xl font-semibold leading-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode
}) {
  return <section className={cn('card p-5', className)} {...props}>{children}</section>
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'warning' | 'danger' | 'ai'
}) {
  return (
    <Card className="min-h-32 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 font-serif text-4xl font-semibold leading-none text-slate-950">{value}</p>
        </div>
        <div
          className={cn(
            'rounded-lg border p-2 shadow-sm',
            tone === 'default' && 'border-forest-100 bg-forest-50 text-forest-700',
            tone === 'warning' && 'border-amber-100 bg-amber-50 text-amber-700',
            tone === 'danger' && 'border-danger-100 bg-danger-50 text-danger-700',
            tone === 'ai' && 'border-ai-100 bg-ai-50 text-ai-700',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-stone-300 bg-cream-50/80 p-6 text-sm font-medium text-slate-500">{text}</div>
}

export function ReadOnlyNotice() {
  const { t } = useTranslation()
  return <Badge status="warning">{t('roles.readOnly')}</Badge>
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation()
  if (alerts.length === 0) return <EmptyState text={t('empty.alerts')} />
  return (
    <div className="mt-4 grid gap-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-md border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">{t(alert.title_key)}</p>
            <Badge status={alert.severity}>{t(`common.${alert.severity}`)}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">{t(alert.message_key)}</p>
        </div>
      ))}
    </div>
  )
}

export function MenuItemRow({ item }: { item: { recipe_id: string; meal_time: MealTime; planned_date: string; allergy_status: AllergyStatus; variety_status: string; calories?: number; protein_g?: number; ai_generated?: boolean } }) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const recipe = data.recipes.find((candidate) => candidate.id === item.recipe_id)
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{recipe?.name}</p>
          <p className="text-sm text-slate-500">{safeDate(item.planned_date)} - {t(`planner.${item.meal_time}`)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge status={item.allergy_status}>{t(item.allergy_status === 'review_needed' ? 'common.reviewNeeded' : `common.${item.allergy_status}`)}</Badge>
          <Badge status={item.variety_status}>{item.variety_status}</Badge>
          {item.ai_generated && <Badge status="ai">{t('nav.aiChef')}</Badge>}
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-600">{formatNumber(item.calories ?? 0)} {t('common.calories')} - {formatNumber(item.protein_g ?? 0)} {t('common.grams')} {t('common.protein')}</p>
    </div>
  )
}

export function NutritionSnapshot() {
  const { t } = useTranslation()
  const { data, diners } = useOperationalContext()
  const today = todayIso()
  const dayItems = data.menuPlanItems.filter((item) => item.planned_date === today)
  return (
    <div className="mt-4 grid gap-3">
      {diners.map((diner) => {
        const calories = dayItems.reduce((sum, item) => sum + (item.calories ?? 0) * diner.portion_factor, 0)
        const protein = dayItems.reduce((sum, item) => sum + (item.protein_g ?? 0) * diner.portion_factor, 0)
        return (
          <div key={diner.id} className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{diner.nickname || diner.full_name}</p>
              <Badge status={calories >= (diner.daily_calorie_target ?? 0) * 0.85 ? 'safe' : 'warning'}>
                {calories >= (diner.daily_calorie_target ?? 0) * 0.85 ? t('nutrition.adequate') : t('nutrition.low')}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{formatNumber(calories)} / {formatNumber(diner.daily_calorie_target ?? 0)} {t('common.calories')} - {formatNumber(protein)} / {formatNumber(diner.daily_protein_target_g ?? 0)}g {t('common.protein')}</p>
          </div>
        )
      })}
    </div>
  )
}

export function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value || '-'}</p>
    </div>
  )
}

export function SimpleList({ items }: { items: string[] }) {
  return <div className="grid gap-2">{items.length ? items.map((item, index) => <p key={`${item}-${index}`} className="rounded-md bg-stone-50 p-2 text-sm text-slate-700">{item}</p>) : <EmptyState text="-" />}</div>
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 md:grid-cols-2"><h3 className="md:col-span-2 font-serif text-xl font-semibold">{title}</h3>{children}</section>
}

export function SkeletonBlock() {
  return <div className="mt-4 grid gap-3" aria-hidden="true"><div className="h-5 animate-pulse rounded bg-stone-200" /><div className="h-20 animate-pulse rounded bg-stone-100" /></div>
}

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const { t } = useTranslation()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), details summary, [tabindex]:not([tabindex="-1"])'
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || [])
    ;(focusable[0] || panelRef.current)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || [])
        .filter((element) => element.offsetParent !== null)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('max-h-[92vh] w-full overflow-auto rounded-lg bg-white p-5 shadow-soft focus:outline-none', wide ? 'max-w-4xl' : 'max-w-lg')}
      >
        <div className="sticky -top-5 z-20 mb-5 flex items-center justify-between border-b border-stone-200 bg-white/95 py-3 backdrop-blur">
          <h2 id={titleId} className="font-serif text-2xl font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose}><XCircle className="h-4 w-4" />{t('common.cancel')}</Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, error, children }: { label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="label">{label}</span>
      {children}
      {error && <span className="text-xs text-danger-700">{error}</span>}
    </label>
  )
}

export function ResponsiveTable({
  headers,
  rows,
  caption,
  compact = false,
}: {
  headers: string[]
  rows: React.ReactNode[][]
  caption?: string
  compact?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white/95 shadow-sm shadow-inset">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="table-head sticky top-0 z-10">
          <tr>{headers.map((header) => <th key={header} scope="col" className={cn('whitespace-nowrap px-4 text-left font-semibold', compact ? 'py-2' : 'py-3')}>{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index} className="odd:bg-white even:bg-stone-50/70 hover:bg-saffron-50/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cn('align-middle text-slate-700', compact ? 'px-3 py-2' : 'px-4 py-3')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TableCard({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <Card>
      <h2 className="mb-4 font-serif text-2xl font-semibold">{title}</h2>
      <ResponsiveTable headers={headers} rows={rows} />
    </Card>
  )
}

export function NutritionCard({ nutrition }: { nutrition: ReturnType<typeof calculateRecipeNutrition> }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {[
        [t('common.calories'), nutrition.total_calories],
        [t('common.protein'), nutrition.total_protein_g],
        [t('common.carbs'), nutrition.total_carbs_g],
        [t('common.fat'), nutrition.total_fat_g],
        [t('common.fiber'), nutrition.total_fiber_g],
        [t('common.sugar'), nutrition.total_sugar_g],
        [t('common.sodium'), nutrition.total_sodium_mg],
        [t('common.iron'), nutrition.total_iron_mg],
      ].map(([label, value]) => (
        <div key={label as string} className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(Number(value), 1)}</p>
        </div>
      ))}
    </div>
  )
}

export function SafetyMatrix({ safety }: { safety: ReturnType<typeof validateRecipeForFamily> }) {
  const { t } = useTranslation()
  return (
    <ResponsiveTable
      headers={[t('common.diner'), t('common.status'), t('common.notes')]}
      rows={safety.map((row) => [
        row.diner.full_name,
        <Badge key="status" status={row.status}>{t(row.status === 'review_needed' ? 'common.reviewNeeded' : `common.${row.status}`)}</Badge>,
        row.reasons.join(', ') || '-',
      ])}
    />
  )
}
