import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge, Button } from '../../shared/chefUi'
import type { AiCopilotSuggestion } from '../types'
import { applyOptionLabel, statusLabel } from '../utils/aiCopilotFormatters'
import { canApplyCopilotSuggestion, getApplyBlockReasonKey, suggestionStatus } from '../utils/aiCopilotGuards'

export default function AiCopilotSuggestionCard({
  suggestion,
  canWrite,
  onApply,
  onRepair,
}: {
  suggestion: AiCopilotSuggestion
  canWrite: boolean
  onApply: (suggestion: AiCopilotSuggestion) => void
  onRepair: (suggestion: AiCopilotSuggestion) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const status = suggestionStatus(suggestion)
  const warnings = [
    ...(suggestion.warnings || []),
    ...(suggestion.safety_notes || []),
  ].filter(Boolean)
  const applicable = canApplyCopilotSuggestion(suggestion, canWrite)
  const blockReasonKey = getApplyBlockReasonKey(suggestion, canWrite)
  const hasDataPayload = suggestion.data && Object.keys(suggestion.data).length > 0
  const applyLabel = t(applyOptionLabel(suggestion.apply_option))
  const translatedStatus = t(statusLabel(status))
  const rotationStatus = suggestion.rotation_status || 'review_needed'
  const nutritionStatus = suggestion.nutrition_status || 'review_needed'
  const inventoryStatus = suggestion.inventory_status || 'review_needed'

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4" data-testid="ai-copilot-suggestion-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">{suggestion.title || t('aiCopilot.suggestedAction')}</h4>
          <p className="mt-1 text-sm text-slate-600">{suggestion.reason || t('aiCopilot.reasonUnavailable')}</p>
        </div>
        <Badge status={status}>{translatedStatus}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge status={status}>{t('ai.allergyValidation')}: {translatedStatus}</Badge>
        <Badge status={rotationStatus}>{t('ai.rotationValidation')}: {t(statusLabel(rotationStatus))}</Badge>
        <Badge status={nutritionStatus}>{t('ai.nutritionValidation')}: {t(statusLabel(nutritionStatus))}</Badge>
        <Badge status={inventoryStatus}>{t('ai.inventoryValidation')}: {t(statusLabel(inventoryStatus))}</Badge>
      </div>
      <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t('aiCopilot.whatWillApply')}</p>
        <p className="mt-1">
          {applicable
            ? t('aiCopilot.applyOptionSummary', { option: applyLabel })
            : t(blockReasonKey || 'aiCopilot.applyMissingData')}
        </p>
        {!hasDataPayload && (
          <p className="mt-1 text-amber-700">{t('aiCopilot.missingStructuredPayload')}</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={!applicable} onClick={() => onApply(suggestion)} data-testid="ai-copilot-apply">
          {applicable ? t('aiCopilot.applySuggestion') : t('aiCopilot.cannotApply')}
        </Button>
        {status === 'review_needed' && (
          <Button type="button" variant="ghost" onClick={() => onRepair(suggestion)} data-testid="ai-copilot-repair-suggestion">
            {t('aiCopilot.repairSuggestion')}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
          {t('aiCopilot.explainWhy')}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 grid gap-3 rounded-md bg-stone-50 p-3 text-sm text-slate-700">
          <p className="font-semibold">{t('aiCopilot.requiredUserAction')}</p>
          <p className="mt-1">{applyLabel}</p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
            </ul>
          )}
          <details>
            <summary className="cursor-pointer font-semibold">{t('aiCopilot.advancedPayload')}</summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-white p-3 text-xs">{JSON.stringify(suggestion.data || {}, null, 2)}</pre>
          </details>
        </div>
      )}
    </article>
  )
}
