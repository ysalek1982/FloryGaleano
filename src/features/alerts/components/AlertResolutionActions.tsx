import { useTranslation } from 'react-i18next'

import { Button } from '../../shared/chefUi'
import type { Alert } from '../../../lib/types'
import { alertResolutionKey } from '../utils/alertFormatters'

export function AlertResolutionActions({
  alert,
  canWrite,
  onMarkRead,
}: {
  alert: Alert
  canWrite: boolean
  onMarkRead: (alertId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-2">
      <p className="text-sm text-slate-600">{t(alertResolutionKey(alert.type))}</p>
      {canWrite && !alert.is_read && (
        <Button variant="secondary" onClick={() => onMarkRead(alert.id)} data-testid="mark-alert-read">
          {t('alerts.markRead')}
        </Button>
      )}
    </div>
  )
}
