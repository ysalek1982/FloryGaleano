import { useTranslation } from 'react-i18next'

import { Card, Field } from '../../shared/chefUi'
import { alertTypeKey } from '../utils/alertFormatters'
import type { useAlertFilters } from '../hooks/useAlertFilters'

type AlertFiltersState = ReturnType<typeof useAlertFilters>

export function AlertFilters({ alerts }: { alerts: AlertFiltersState }) {
  const { t } = useTranslation()
  return (
    <Card className="print:hidden">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label={t('common.family')}>
          <select className="input" value={alerts.familyId} onChange={(event) => alerts.setFamilyId(event.target.value)} data-testid="alerts-family">
            <option value="all">{t('common.all')}</option>
            {alerts.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
        <Field label={t('common.status')}>
          <select className="input" value={alerts.severity} onChange={(event) => alerts.setSeverity(event.target.value)} data-testid="alerts-severity">
            <option value="all">{t('common.all')}</option>
            <option value="info">{t('common.info')}</option>
            <option value="warning">{t('common.warning')}</option>
            <option value="critical">{t('common.critical')}</option>
          </select>
        </Field>
        <Field label={t('alerts.type')}>
          <select className="input" value={alerts.type} onChange={(event) => alerts.setType(event.target.value)} data-testid="alerts-type">
            <option value="all">{t('common.all')}</option>
            {alerts.types.map((type) => <option key={type} value={type}>{t(alertTypeKey(type))}</option>)}
          </select>
        </Field>
        <Field label={t('alerts.readStatus')}>
          <select className="input" value={alerts.readStatus} onChange={(event) => alerts.setReadStatus(event.target.value as 'all' | 'unread' | 'read')} data-testid="alerts-read-status">
            <option value="all">{t('common.all')}</option>
            <option value="unread">{t('alerts.unread')}</option>
            <option value="read">{t('alerts.read')}</option>
          </select>
        </Field>
      </div>
    </Card>
  )
}
