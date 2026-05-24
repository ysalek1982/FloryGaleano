import { useTranslation } from 'react-i18next'

import { AlertList, Card } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function CriticalAlertsPanel({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  const visibleAlerts = dashboard.criticalAlerts.length ? dashboard.criticalAlerts : dashboard.alerts.slice(0, 5)
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.criticalSafetyAlerts')}</h2>
      <AlertList alerts={visibleAlerts} />
    </Card>
  )
}
