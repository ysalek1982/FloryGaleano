import { useTranslation } from 'react-i18next'

import { Card, Field } from '../../shared/chefUi'
import type { useSettingsForm } from '../hooks/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

export function MenuRulesSettingsPanel({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.menuRulesPanel')}</h2>
      <div className="mt-4 grid gap-4">
        <Field label={t('settings.rotationDays')}>
          <input className="input" type="number" value={settings.settings.default_variety_days} onChange={(event) => settings.updateSettings({ default_variety_days: Number(event.target.value) })} />
        </Field>
        <Field label={t('settings.nutritionThresholds')}>
          <input className="input" type="number" step="0.05" value={settings.settings.nutrition_low_threshold_pct} onChange={(event) => settings.updateSettings({ nutrition_low_threshold_pct: Number(event.target.value) })} />
        </Field>
        <Field label={t('settings.allergyStrictness')}>
          <select className="input" value={settings.settings.allergy_strictness} onChange={(event) => settings.updateSettings({ allergy_strictness: event.target.value as 'standard' | 'strict' })}>
            <option value="standard">{t('settings.standard')}</option>
            <option value="strict">{t('settings.strict')}</option>
          </select>
        </Field>
      </div>
    </Card>
  )
}
