import { Brain } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge, Button } from '../../shared/chefUi'
import { useAiCopilot } from '../hooks/useAiCopilot'
import type { AiCopilotPageContext } from '../types'
import { getCopilotAvailability } from '../utils/aiCopilotGuards'

export default function AiCopilotButton({
  context,
  actionKey,
  labelKey = 'aiCopilot.open',
  compact = false,
  testId = 'ai-copilot-button',
}: {
  context?: Partial<AiCopilotPageContext>
  actionKey?: string
  labelKey?: string
  compact?: boolean
  testId?: string
}) {
  const { t } = useTranslation()
  const copilot = useAiCopilot()
  const availability = getCopilotAvailability(copilot.aiStatus)

  return (
    <Button
      type="button"
      variant="ai"
      className={compact ? 'px-3 py-2' : undefined}
      onClick={() => copilot.openCopilot(context, actionKey)}
      data-testid={testId}
      aria-label={t(labelKey)}
    >
      <Brain className="h-4 w-4" aria-hidden="true" />
      <span>{t(labelKey)}</span>
      {!compact && <Badge status={availability.tone}>{t(availability.badgeKey)}</Badge>}
    </Button>
  )
}
