import { useTranslation } from 'react-i18next'

import { Card, Info } from '../../shared/chefUi'
import { isSupabaseConfigured } from '../../../lib/supabase'

export function QaEnvironmentPanel() {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.qaPanel')}</h2>
      <div className="mt-4 grid gap-4">
        <Info label={t('settings.rlsDebug')} value={isSupabaseConfigured ? t('settings.rlsReady') : t('settings.rlsLocalFallback')} />
        <Info label={t('settings.crudHealth')} value={isSupabaseConfigured ? t('settings.remoteQaReady') : t('settings.localOnly')} />
        <Info label={t('settings.secretsDisplay')} value={t('settings.secretsHidden')} />
      </div>
    </Card>
  )
}
