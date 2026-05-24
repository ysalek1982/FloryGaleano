import { useTranslation } from 'react-i18next'

import { Card, Field, Info } from '../../shared/chefUi'
import type { useSettingsForm } from '../hooks/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

export function ProfileSettingsForm({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.profile')}</h2>
      <div className="mt-4 grid gap-4">
        <Info label={t('auth.email')} value={settings.profile?.email || '-'} />
        <Field label={t('auth.fullName')}>
          <input
            className="input"
            value={settings.profile?.full_name || ''}
            onChange={(event) => settings.profile && settings.updateProfile({ ...settings.profile, full_name: event.target.value })}
          />
        </Field>
      </div>
    </Card>
  )
}
