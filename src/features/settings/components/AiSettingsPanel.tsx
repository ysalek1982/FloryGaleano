import { useTranslation } from 'react-i18next'

import { Button, Card, Field, Info } from '../../shared/chefUi'
import { useAiConnectionTest } from '../hooks/useAiConnectionTest'
import type { useSettingsForm } from '../hooks/useSettingsForm'
import { visibleModelName } from '../utils/settingsFormatters'

type SettingsForm = ReturnType<typeof useSettingsForm>

export function AiSettingsPanel({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  const ai = useAiConnectionTest()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('settings.aiPanel')}</h2>
      <div className="mt-4 grid gap-4">
        <Field label={t('settings.geminiEnabled')}>
          <select className="input" value={settings.settings.gemini_enabled ? 'enabled' : 'disabled'} onChange={(event) => settings.updateSettings({ gemini_enabled: event.target.value === 'enabled' })}>
            <option value="enabled">{t('common.enabled')}</option>
            <option value="disabled">{t('common.disabled')}</option>
          </select>
        </Field>
        <Field label={t('settings.model')}>
          <input className="input" value={visibleModelName(settings.settings.ai_model)} onChange={(event) => settings.updateSettings({ ai_model: event.target.value })} />
        </Field>
        <Info label={t('settings.aiBackend')} value={t('settings.edgeFunctionOnly')} />
        <Button variant="ai" onClick={ai.testConnection} disabled={ai.testing} data-testid="settings-ai-test">
          {ai.testing ? t('common.loading') : t('ai.testConnection')}
        </Button>
        {ai.message && <p className="rounded-md bg-stone-50 p-3 text-sm text-slate-700" data-testid="settings-ai-result">{ai.message}</p>}
      </div>
    </Card>
  )
}
