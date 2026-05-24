import { useTranslation } from 'react-i18next'

import { Card, Field } from '../../shared/chefUi'
import type { useSettingsForm } from '../hooks/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

export function UnitsSettingsPanel({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.unitsPanel')}</h2>
      <div className="mt-4 grid gap-4">
        <Field label={t('settings.defaultUnits')}>
          <select className="input" value={settings.settings.default_units} onChange={(event) => settings.updateSettings({ default_units: event.target.value as 'metric' | 'imperial' })}>
            <option value="metric">{t('settings.metric')}</option>
            <option value="imperial">{t('settings.imperial')}</option>
          </select>
        </Field>
        <Field label={t('settings.theme')}>
          <select className="input" value={settings.settings.theme} onChange={(event) => settings.updateSettings({ theme: event.target.value as 'light' | 'system' })}>
            <option value="light">{t('settings.light')}</option>
            <option value="system">{t('settings.system')}</option>
          </select>
        </Field>
      </div>
    </Card>
  )
}
