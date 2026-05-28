import type { ReactNode } from 'react'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAiConnectionTest } from '../../settings/hooks/useAiConnectionTest'
import { AiCopilotContext } from '../hooks/useAiCopilot'
import { useAiCopilotActions } from '../hooks/useAiCopilotActions'
import { useAiPageContext } from '../hooks/useAiPageContext'
import type { AiCopilotActionDefinition, AiCopilotPageContext, AiCopilotResponse } from '../types'
import { getAiCopilotAction } from '../utils/aiCopilotRegistry'
import { getCopilotAvailability } from '../utils/aiCopilotGuards'

const AiCopilotDrawer = lazy(() => import('./AiCopilotDrawer'))

export default function AiCopilotProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const currentPageContext = useAiPageContext()
  const aiStatus = useAiConnectionTest()
  const actions = useAiCopilotActions()
  const [open, setOpen] = useState(false)
  const [pageContext, setPageContext] = useState<AiCopilotPageContext | null>(null)
  const [result, setResult] = useState<AiCopilotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const resolveContext = useCallback((context?: Partial<AiCopilotPageContext>) => ({
    ...currentPageContext,
    ...context,
    relevant_records: {
      ...(currentPageContext.relevant_records || {}),
      ...(context?.relevant_records || {}),
    },
  }), [currentPageContext])

  const runAction = useCallback(async (action: AiCopilotActionDefinition, context?: Partial<AiCopilotPageContext>) => {
    const nextContext = resolveContext(context || pageContext || undefined)
    setPageContext(nextContext)
    setOpen(true)
    setMessage('')
    const availability = getCopilotAvailability(aiStatus.status)
    if (!availability.canRun) {
      setResult({
        status: 'review_needed',
        page_id: nextContext.page_id,
        action: action.edgeAction,
        title: t(availability.badgeKey),
        summary: t(aiStatus.status.key_status === 'rate_limited' ? 'aiCopilot.rateLimitedBody' : 'aiCopilot.setupBody'),
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: [t(availability.badgeKey)],
          warnings: [],
        },
        retry_after_seconds: aiStatus.status.retry_after_seconds,
        code: aiStatus.status.key_status === 'rate_limited' ? 'gemini_rate_limited' : 'gemini_key_missing',
      })
      return
    }

    setLoading(true)
    try {
      const response = await actions.invokeAction(action, nextContext)
      setResult(response)
    } catch {
      setResult({
        status: 'review_needed',
        page_id: nextContext.page_id,
        action: action.edgeAction,
        title: t('aiCopilot.providerFailureTitle'),
        summary: t('aiCopilot.providerFailureBody'),
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: [t('aiCopilot.providerFailureBody')],
          warnings: [],
        },
      })
    } finally {
      setLoading(false)
    }
  }, [actions, aiStatus.status, pageContext, resolveContext, t])

  const openCopilot = useCallback((context?: Partial<AiCopilotPageContext>, actionKey?: string) => {
    const nextContext = resolveContext(context)
    setPageContext(nextContext)
    setOpen(true)
    if (actionKey) {
      const action = getAiCopilotAction(actionKey)
      if (action) void runAction(action, nextContext)
    }
  }, [resolveContext, runAction])
  const closeCopilot = useCallback(() => setOpen(false), [])
  const clearResult = useCallback(() => setResult(null), [])
  const testAgain = useCallback(async () => {
    await aiStatus.testConnection(undefined, aiStatus.status.model)
  }, [aiStatus])

  const value = useMemo(() => ({
    open,
    loading,
    message,
    result,
    pageContext,
    aiStatus: aiStatus.status,
    testing: aiStatus.testing,
    openCopilot,
    closeCopilot,
    runAction,
    clearResult,
    testAgain,
  }), [aiStatus.status, aiStatus.testing, clearResult, closeCopilot, loading, message, open, openCopilot, pageContext, result, runAction, testAgain])

  return (
    <AiCopilotContext.Provider value={value}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <AiCopilotDrawer />
        </Suspense>
      )}
    </AiCopilotContext.Provider>
  )
}
