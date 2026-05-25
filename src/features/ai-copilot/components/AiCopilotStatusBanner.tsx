import { AlertTriangle, CheckCircle2, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Badge, Button } from '../../shared/chefUi'
import { useAiCopilot } from '../hooks/useAiCopilot'
import { getCopilotAvailability } from '../utils/aiCopilotGuards'

export default function AiCopilotStatusBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const copilot = useAiCopilot()
  const availability = getCopilotAvailability(copilot.aiStatus)
  const ready = availability.tone === 'safe'

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4" data-testid="ai-copilot-status">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          {ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-forest-700" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" aria-hidden="true" />}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{t('aiCopilot.statusTitle')}</h3>
              <Badge status={availability.tone}>{t(availability.badgeKey)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {copilot.aiStatus.key_status === 'rate_limited'
                ? t('aiCopilot.rateLimitedBody')
                : ready
                  ? t('aiCopilot.readyBody')
                  : t('aiCopilot.setupBody')}
            </p>
            {copilot.aiStatus.key_status === 'rate_limited' && (
              <p className="mt-2 text-sm font-semibold text-amber-800" data-testid="ai-copilot-retry-after">
                {t('aiCopilot.retryAfter', { seconds: copilot.aiStatus.retry_after_seconds || 0 })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {copilot.aiStatus.key_status === 'rate_limited' && (
            <Button type="button" variant="secondary" onClick={() => void copilot.testAgain()} disabled={copilot.testing} data-testid="ai-copilot-test-again">
              {copilot.testing ? t('common.loading') : t('settings.testAgain')}
            </Button>
          )}
          {!ready && (
            <Button type="button" variant="ai" onClick={() => navigate('/app/settings')} data-testid="ai-copilot-go-settings">
              <Settings className="h-4 w-4" aria-hidden="true" />
              {t('ai.goToSettings')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
