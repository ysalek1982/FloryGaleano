import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlertFilters } from '../../features/alerts/components/AlertFilters'
import { AlertsSummaryCards } from '../../features/alerts/components/AlertsSummaryCards'
import { AlertsTable } from '../../features/alerts/components/AlertsTable'
import { useAlertActions } from '../../features/alerts/hooks/useAlertActions'
import { useAlertFilters } from '../../features/alerts/hooks/useAlertFilters'
import { Button, Card, PageHeader, ReadOnlyNotice } from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'

export default function AlertsPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const actions = useAlertActions()
  const alerts = useAlertFilters(actions.localReadIds)

  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        action={
          canWrite ? (
            <Button variant="secondary" onClick={() => actions.markAllRead(alerts.alerts.map((alert) => alert.id))} data-testid="mark-all-alerts-read">
              <CheckCircle2 className="h-4 w-4" />
              {t('alerts.markAllRead')}
            </Button>
          ) : (
            <ReadOnlyNotice />
          )
        }
      />
      <div className="grid gap-5">
        <AlertsSummaryCards alerts={alerts} />
        <AlertFilters alerts={alerts} />
        <Card>
          <h2 className="mb-4 font-serif text-2xl font-semibold">{t('alerts.operationalQueue')}</h2>
          <AlertsTable alerts={alerts} canWrite={canWrite} onMarkRead={actions.markRead} />
        </Card>
      </div>
    </>
  )
}
