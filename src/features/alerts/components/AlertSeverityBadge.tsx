import { useTranslation } from 'react-i18next'

import { Badge } from '../../shared/chefUi'
import type { AlertSeverity } from '../../../lib/types'

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { t } = useTranslation()
  return <Badge status={severity}>{t(`common.${severity}`)}</Badge>
}
