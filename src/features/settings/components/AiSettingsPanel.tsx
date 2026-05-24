import { ExternalLink, KeyRound, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge, Button, Card, Field, Info } from '../../shared/chefUi'
import { useAiConnectionTest } from '../hooks/useAiConnectionTest'
import type { useSettingsForm } from '../hooks/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

const modelOptions = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']

export function AiSettingsPanel({ settings }: { settings: SettingsForm }) {
  const { t } = useTranslation()
  const ai = useAiConnectionTest()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(settings.settings.ai_model || 'gemini-2.5-flash')
  const hasQuotaIssue = /429|quota|rate limit/i.test(`${ai.message} ${ai.status.last_error || ''}`)
  const hasStoredKeyMetadata = Boolean(ai.status.key_last4)

  const clearKey = () => setApiKey('')

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{t('settings.aiPanel')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('settings.geminiByokDescription')}</p>
        </div>
        <Badge status={ai.status.key_status === 'valid' ? 'safe' : ai.status.key_status === 'not_configured' || ai.status.key_status === 'deleted' ? undefined : 'warning'}>
          {t(`settings.aiKeyStatus.${ai.status.key_status}`)}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4">
        <Info label={t('settings.aiBackend')} value={t('settings.edgeFunctionOnly')} />
        <Info label={t('settings.keySecurity')} value={t('settings.geminiEncryptedNotice')} />
        <Info label={t('settings.geminiConfigured')} value={ai.status.configured ? t('common.yes') : t('common.no')} />
        <Info label={t('settings.keyLast4')} value={ai.status.key_last4 ? `**** ${ai.status.key_last4}` : t('common.notConfigured')} />
        <Info label={t('settings.lastKeyTest')} value={ai.status.last_tested_at || t('settings.notRecorded')} />
        <Field label={t('settings.model')}>
          <select
            className="input"
            value={model}
            onChange={(event) => {
              setModel(event.target.value)
              settings.updateSettings({ ai_model: event.target.value, gemini_enabled: true })
            }}
            data-testid="settings-ai-model"
          >
            {modelOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label={t('settings.geminiApiKey')}>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={ai.status.configured ? t('settings.replaceGeminiKey') : t('settings.pasteGeminiKey')}
            autoComplete="off"
            data-testid="settings-gemini-key"
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="ai"
            onClick={async () => {
              await ai.saveKey(apiKey, model)
              clearKey()
              settings.updateSettings({ ai_model: model, gemini_enabled: true })
            }}
            disabled={ai.testing || !apiKey.trim()}
            data-testid="settings-ai-save-key"
          >
            <KeyRound className="h-4 w-4" />
            {ai.status.configured ? t('settings.replaceKey') : t('settings.saveKey')}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await ai.testConnection(apiKey || undefined, model)
              clearKey()
            }}
            disabled={ai.testing || (!apiKey.trim() && !hasStoredKeyMetadata)}
            data-testid="settings-ai-test"
          >
            {ai.testing ? t('common.loading') : t('ai.testConnection')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await ai.deleteKey()
              clearKey()
              settings.updateSettings({ gemini_enabled: false })
            }}
            disabled={ai.testing || !hasStoredKeyMetadata}
            data-testid="settings-ai-delete-key"
          >
            <Trash2 className="h-4 w-4" />
            {t('settings.deleteKey')}
          </Button>
        </div>
        {ai.message && <p className="rounded-md bg-stone-50 p-3 text-sm text-slate-700" data-testid="settings-ai-result">{ai.message}</p>}
        {ai.status.last_error && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{ai.status.last_error}</p>}
        {hasQuotaIssue && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="settings-gemini-quota-help">
            <p className="font-semibold">{t('settings.geminiQuotaTitle')}</p>
            <p className="mt-1">{t('settings.geminiQuotaBody')}</p>
          </div>
        )}
        <div className="rounded-lg border border-ai-100 bg-ai-50 p-3 text-sm text-ai-900">
          <a className="inline-flex items-center gap-2 font-semibold underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
            {t('settings.createGeminiKey')} <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-2">{t('settings.geminiCostNotice')}</p>
          <p className="mt-1">{t('settings.geminiKeySafetyNotice')}</p>
        </div>
      </div>
    </Card>
  )
}
