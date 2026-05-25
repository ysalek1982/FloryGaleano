import { createContext, useContext } from 'react'

import type { AiKeyStatus } from '../../settings/hooks/useAiConnectionTest'
import type { AiCopilotActionDefinition, AiCopilotPageContext, AiCopilotResponse } from '../types'

export interface AiCopilotContextValue {
  open: boolean
  loading: boolean
  message: string
  result: AiCopilotResponse | null
  pageContext: AiCopilotPageContext | null
  aiStatus: AiKeyStatus
  testing: boolean
  openCopilot: (context?: Partial<AiCopilotPageContext>, actionKey?: string) => void
  closeCopilot: () => void
  runAction: (action: AiCopilotActionDefinition, context?: Partial<AiCopilotPageContext>) => Promise<void>
  clearResult: () => void
  testAgain: () => Promise<void>
}

export const AiCopilotContext = createContext<AiCopilotContextValue | null>(null)

export function useAiCopilot() {
  const context = useContext(AiCopilotContext)
  if (!context) throw new Error('useAiCopilot must be used inside AiCopilotProvider')
  return context
}
