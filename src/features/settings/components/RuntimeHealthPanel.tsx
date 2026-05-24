import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../../lib/AppState'
import { appEnv, appVersion, isMonitoringConfigured, isProductionApp } from '../../../lib/env'
import { isSupabaseConfigured, supabase, supabaseHost } from '../../../lib/supabase'
import { Badge, Button, Card, Info } from '../../shared/chefUi'

type HealthStatus = 'not_checked' | 'healthy' | 'warning'

export function RuntimeHealthPanel() {
  const { t } = useTranslation()
  const { isAuthenticated, profile } = useAuth()
  const [aiStatus, setAiStatus] = useState<HealthStatus>('not_checked')
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const lastSmoke = localStorage.getItem('smart-family-meals:last-smoke') || t('settings.notRecorded')

  const checkAi = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAiStatus('warning')
      setGeminiConfigured(false)
      return
    }
    setChecking(true)
    const { data, error } = await supabase.functions.invoke('ai-chef', { body: { action: 'ping' } })
    setChecking(false)
    setAiStatus(error || !data?.configured ? 'warning' : 'healthy')
    setGeminiConfigured(Boolean(data?.gemini_configured))
    if (!error && data?.configured) {
      localStorage.setItem('smart-family-meals:last-smoke', new Date().toISOString())
    }
  }

  return (
    <Card data-testid="runtime-health-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('settings.runtimeHealth')}</h2>
        <Badge status={aiStatus === 'healthy' ? 'safe' : aiStatus === 'warning' ? 'warning' : undefined}>
          {t(`settings.health.${aiStatus}`)}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4">
        <Info label={t('settings.appVersion')} value={appVersion} />
        <Info label={t('settings.appEnvironment')} value={appEnv} />
        <Info label={t('settings.currentRole')} value={profile ? t(`roles.${profile.role}`) : t('settings.notAuthenticated')} />
        <Info label={t('settings.supabaseStatus')} value={isSupabaseConfigured ? t('common.configured') : t('common.notConfigured')} />
        <Info label={t('settings.supabaseHost')} value={supabaseHost || t('common.notConfigured')} />
        <Info label={t('settings.authStatus')} value={isAuthenticated ? t('settings.authenticated') : t('settings.notAuthenticated')} />
        <Info label={t('settings.edgeFunctionStatus')} value={t(`settings.health.${aiStatus}`)} />
        <Info label={t('settings.geminiConfigured')} value={geminiConfigured === null ? t('settings.health.not_checked') : geminiConfigured ? t('common.configured') : t('common.notConfigured')} />
        <Info label={t('settings.exportCapability')} value={typeof Blob !== 'undefined' ? t('settings.available') : t('common.notConfigured')} />
        <Info label={t('settings.monitoringStatus')} value={isMonitoringConfigured ? t('common.configured') : t('common.notConfigured')} />
        <Info label={t('settings.productionSafeguards')} value={isProductionApp ? t('common.enabled') : t('settings.developmentMode')} />
        <Info label={t('settings.lastSmoke')} value={lastSmoke} />
        <Button variant="secondary" onClick={checkAi} disabled={checking} data-testid="runtime-health-check">
          {checking ? t('common.loading') : t('settings.runHealthCheck')}
        </Button>
      </div>
    </Card>
  )
}
