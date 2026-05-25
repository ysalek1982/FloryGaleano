import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, EmptyState, SkeletonBlock } from '../../shared/chefUi'
import { useCanWrite } from '../../shared/chefHooks'
import { useAiCopilot } from '../hooks/useAiCopilot'
import type { AiCopilotSuggestion } from '../types'
import { getAiCopilotAction } from '../utils/aiCopilotRegistry'
import AiCopilotApplyDialog from './AiCopilotApplyDialog'
import AiCopilotSuggestionCard from './AiCopilotSuggestionCard'

export default function AiCopilotResultPreview() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const copilot = useAiCopilot()
  const [applying, setApplying] = useState<AiCopilotSuggestion | null>(null)
  const result = copilot.result
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : []

  const repairSuggestion = (suggestion: AiCopilotSuggestion) => {
    const repairAction = getAiCopilotAction(`${copilot.pageContext?.page_id === 'menu_planner' ? 'menuPlanner.repairUnsafe' : 'dayPlanner.repairDay'}`)
    if (repairAction) void copilot.runAction(repairAction, {
      relevant_records: {
        repair_target: suggestion,
      },
    })
  }

  return (
    <Card className="shadow-none">
      <h3 className="font-semibold">{t('aiCopilot.resultPreview')}</h3>
      {copilot.loading && <SkeletonBlock />}
      {!copilot.loading && !result && <EmptyState text={t('aiCopilot.emptyResult')} />}
      {result && (
        <div className="mt-3 grid gap-3" data-testid="ai-copilot-result">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="font-semibold">{result.title || t('aiCopilot.suggestedAction')}</p>
            <p className="mt-1 text-sm text-slate-600">{result.summary || result.message || t('aiCopilot.reviewBeforeApply')}</p>
          </div>
          {suggestions.length === 0 ? (
            <EmptyState text={t('aiCopilot.noSuggestions')} />
          ) : suggestions.map((suggestion, index) => (
            <AiCopilotSuggestionCard
              key={suggestion.id || index}
              suggestion={suggestion}
              canWrite={canWrite}
              onApply={setApplying}
              onRepair={repairSuggestion}
            />
          ))}
        </div>
      )}
      {applying && (
        <AiCopilotApplyDialog
          suggestion={applying}
          onClose={() => setApplying(null)}
          onApplied={() => {
            setApplying(null)
          }}
        />
      )}
    </Card>
  )
}
