import { AlertTriangle, Bell, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MetricCard } from '../../shared/chefUi'
import type { useAlertFilters } from '../hooks/useAlertFilters'

type AlertFilters = ReturnType<typeof useAlertFilters>

export function AlertsSummaryCards({ alerts }: { alerts: AlertFilters }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t('common.critical')} value={alerts.summary.critical} icon={ShieldAlert} tone="danger" />
      <MetricCard label={t('common.warning')} value={alerts.summary.warning} icon={AlertTriangle} tone="warning" />
      <MetricCard label={t('alerts.unread')} value={alerts.summary.unread} icon={Bell} tone={alerts.summary.unread ? 'warning' : 'default'} />
      <MetricCard label={t('alerts.resolved')} value={Math.max(0, alerts.summary.total - alerts.summary.unread)} icon={CheckCircle2} />
    </div>
  )
}
