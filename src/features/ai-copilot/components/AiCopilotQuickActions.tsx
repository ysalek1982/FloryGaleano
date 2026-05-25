import { Brain, FileText, Settings, ShieldAlert, ShoppingCart, Sparkles, Warehouse } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, Card, EmptyState } from '../../shared/chefUi'
import { useAiCopilot } from '../hooks/useAiCopilot'
import type { AiCopilotActionDefinition, AiCopilotPageContext } from '../types'
import { getCopilotAvailability } from '../utils/aiCopilotGuards'

const icons = {
  brain: Brain,
  sparkles: Sparkles,
  shield: ShieldAlert,
  shopping: ShoppingCart,
  inventory: Warehouse,
  report: FileText,
  settings: Settings,
}

export default function AiCopilotQuickActions({
  actions,
  pageContext,
}: {
  actions: AiCopilotActionDefinition[]
  pageContext?: AiCopilotPageContext
}) {
  const { t } = useTranslation()
  const copilot = useAiCopilot()
  const availability = getCopilotAvailability(copilot.aiStatus)

  return (
    <Card className="shadow-none">
      <h3 className="font-semibold">{t('aiCopilot.quickActions')}</h3>
      <div className="mt-3 grid gap-2">
        {actions.length === 0 ? (
          <EmptyState text={t('aiCopilot.noActions')} />
        ) : actions.map((action) => {
          const Icon = icons[action.icon || 'brain']
          const testId = `ai-copilot-action-${action.key.replaceAll('.', '-')}`
          return (
            <Button
              key={action.key}
              type="button"
              variant="secondary"
              className="justify-start text-left"
              disabled={copilot.loading || !availability.canRun}
              onClick={() => void copilot.runAction(action, pageContext)}
              data-testid={testId}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="block">{t(action.labelKey)}</span>
                <span className="block text-xs font-normal text-slate-500">{t(action.descriptionKey)}</span>
              </span>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
