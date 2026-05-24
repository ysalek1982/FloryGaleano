import {
  Archive,
  Bell,
  Brain,
  CalendarDays,
  ClipboardList,
  Gauge,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  UserPlus,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MetricCard } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function DashboardStats({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  const metrics = [
    [t('dashboard.activeFamilies'), dashboard.data.families.length, Users, 'default'],
    [t('dashboard.activeDiners'), dashboard.diners.length, UserPlus, 'default'],
    [t('dashboard.todaysMenus'), dashboard.todayItems.length, CalendarDays, 'default'],
    [t('dashboard.criticalAlerts'), dashboard.criticalAlerts.length, Bell, 'danger'],
    [t('dashboard.missingIngredients'), dashboard.missingIngredients.length, ShoppingCart, 'warning'],
    [t('dashboard.recipesReview'), dashboard.recipesReview.length, ClipboardList, 'warning'],
    [t('dashboard.allergyBlocks'), dashboard.allergyBlocks.length, ShieldAlert, 'danger'],
    [t('dashboard.repeatedDishes'), dashboard.repeatedDishes.length, CalendarDays, 'warning'],
    [t('dashboard.weeklyVariety'), `${dashboard.varietyScore}%`, Gauge, 'default'],
    [t('dashboard.pantryLow'), dashboard.lowStock.length, Archive, 'warning'],
    [t('dashboard.freezerExpiring'), dashboard.freezerExpiring.length, Snowflake, 'warning'],
    [t('dashboard.aiStatus'), dashboard.aiEnabled ? t('common.enabled') : t('common.disabled'), Brain, 'ai'],
  ] as const

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-stats">
      {metrics.map(([label, value, Icon, tone]) => (
        <MetricCard key={label} label={label} value={value} icon={Icon} tone={tone} />
      ))}
    </div>
  )
}
