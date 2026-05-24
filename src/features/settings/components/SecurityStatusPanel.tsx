import { useTranslation } from 'react-i18next'

import { Badge, Card, Info, SimpleList } from '../../shared/chefUi'
import { isSupabaseConfigured } from '../../../lib/supabase'

export function SecurityStatusPanel() {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('settings.secureStatus')}</h2>
        <Badge status={isSupabaseConfigured ? 'safe' : 'warning'}>{isSupabaseConfigured ? t('common.configured') : t('common.notConfigured')}</Badge>
      </div>
      <div className="mt-4 grid gap-4">
        <Info label={t('settings.supabaseStatus')} value={isSupabaseConfigured ? t('common.configured') : t('common.notConfigured')} />
        <SimpleList
          items={[
            t('settings.securityFrontend'),
            t('settings.securityAi'),
            t('settings.securitySecrets'),
            t('settings.securityRls'),
          ]}
        />
      </div>
    </Card>
  )
}
