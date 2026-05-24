import { useTranslation } from 'react-i18next'

import { Badge, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { useAlertFilters } from '../hooks/useAlertFilters'
import { alertTypeKey } from '../utils/alertFormatters'
import { AlertRelatedEntityLink } from './AlertRelatedEntityLink'
import { AlertResolutionActions } from './AlertResolutionActions'
import { AlertSeverityBadge } from './AlertSeverityBadge'

type AlertFilters = ReturnType<typeof useAlertFilters>

export function AlertsTable({
  alerts,
  canWrite,
  onMarkRead,
}: {
  alerts: AlertFilters
  canWrite: boolean
  onMarkRead: (alertId: string) => void
}) {
  const { t } = useTranslation()
  if (alerts.alerts.length === 0) return <EmptyState text={t('empty.alerts')} />
  return (
    <ResponsiveTable
      headers={[t('common.family'), t('alerts.type'), t('common.critical'), t('common.status'), t('alerts.suggestedResolution'), t('alerts.related'), t('common.actions')]}
      rows={alerts.alerts.map((alert) => [
        alerts.data.families.find((family) => family.id === alert.family_id)?.name || '-',
        t(alertTypeKey(alert.type)),
        <AlertSeverityBadge key="severity" severity={alert.severity} />,
        <Badge key="read" status={alert.is_read ? 'safe' : 'warning'}>{alert.is_read ? t('alerts.read') : t('alerts.unread')}</Badge>,
        t(alert.message_key),
        <AlertRelatedEntityLink key="related" alert={alert} />,
        <AlertResolutionActions key="actions" alert={alert} canWrite={canWrite} onMarkRead={onMarkRead} />,
      ])}
    />
  )
}
