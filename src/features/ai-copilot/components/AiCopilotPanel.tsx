import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Card } from '../../shared/chefUi'
import { useAiCopilot } from '../hooks/useAiCopilot'
import { getAiCopilotActions } from '../utils/aiCopilotRegistry'
import { pageLabelKey } from '../utils/aiCopilotFormatters'
import AiCopilotQuickActions from './AiCopilotQuickActions'
import AiCopilotResultPreview from './AiCopilotResultPreview'
import AiCopilotStatusBanner from './AiCopilotStatusBanner'

export default function AiCopilotPanel() {
  const { t } = useTranslation()
  const copilot = useAiCopilot()
  const pageContext = copilot.pageContext
  const actions = pageContext ? getAiCopilotActions(pageContext.page_id) : []

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ai-700">{t('aiCopilot.eyebrow')}</p>
        <h2 id="ai-copilot-title" className="font-serif text-3xl font-semibold text-slate-950">{t('aiCopilot.title')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('aiCopilot.subtitle')}</p>
      </div>
      <AiCopilotStatusBanner />
      <Card className="shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t('aiCopilot.contextTitle')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {pageContext ? t(pageLabelKey(pageContext.page_id)) : t('common.empty')}
            </p>
          </div>
          <Link to="/app/ai-chef" className="inline-flex items-center gap-2 rounded-md border border-ai-100 bg-ai-50 px-3 py-2 text-sm font-semibold text-ai-800 focus-ring" data-testid="ai-copilot-full-workspace">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('aiCopilot.fullWorkspace')}
          </Link>
        </div>
      </Card>
      <AiCopilotQuickActions actions={actions} pageContext={pageContext || undefined} />
      <AiCopilotResultPreview />
    </div>
  )
}
