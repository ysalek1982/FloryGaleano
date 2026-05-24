import { useTranslation } from 'react-i18next'

import { Card, Field } from '../../shared/chefUi'
import type { useSettingsForm } from '../hooks/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

export function LanguageSettingsPanel({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.languagePanel')}</h2>
      <div className="mt-4">
        <Field label={t('settings.preferredLanguage')}>
          <select
            className="input"
            value={settings.profile?.preferred_language || 'en'}
            onChange={(event) => settings.updateLanguage(event.target.value as 'en' | 'es')}
            data-testid="settings-language"
          >
            <option value="en">{t('common.english')}</option>
            <option value="es">{t('common.spanish')}</option>
          </select>
        </Field>
      </div>
    </Card>
  )
}
