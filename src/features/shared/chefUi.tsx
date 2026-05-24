import { XCircle } from 'lucide-react'
import type React from 'react'
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
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-forest-700 text-white hover:bg-forest-600',
        variant === 'secondary' && 'border border-stone-300 bg-white text-slate-800 hover:bg-stone-50',
        variant === 'ghost' && 'text-slate-700 hover:bg-stone-100',
        variant === 'danger' && 'bg-danger-600 text-white hover:bg-danger-700',
        variant === 'ai' && 'bg-ai-600 text-white hover:bg-ai-700',
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
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', style)}>{children}</span>
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
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-slate-950">{title}</h1>
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
    <Card className="min-h-32">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div
          className={cn(
            'rounded-lg p-2',
            tone === 'default' && 'bg-forest-50 text-forest-700',
            tone === 'warning' && 'bg-amber-50 text-amber-700',
            tone === 'danger' && 'bg-danger-50 text-danger-700',
            tone === 'ai' && 'bg-ai-50 text-ai-700',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">{text}</div>
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
  return <div className="grid gap-2">{items.length ? items.map((item) => <p key={item} className="rounded-md bg-stone-50 p-2 text-sm text-slate-700">{item}</p>) : <EmptyState text="-" />}</div>
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 md:grid-cols-2"><h3 className="md:col-span-2 font-serif text-xl font-semibold">{title}</h3>{children}</section>
}

export function SkeletonBlock() {
  return <div className="mt-4 grid gap-3" aria-hidden="true"><div className="h-5 animate-pulse rounded bg-stone-200" /><div className="h-20 animate-pulse rounded bg-stone-100" /></div>
}

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className={cn('max-h-[92vh] w-full overflow-auto rounded-lg bg-white p-5 shadow-soft', wide ? 'max-w-4xl' : 'max-w-lg')}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">{title}</h2>
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

export function ResponsiveTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        <thead className="table-head">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>
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
