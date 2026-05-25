import { useTranslation } from 'react-i18next'

import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import type { AiCopilotActionDefinition, AiCopilotPageContext, AiCopilotResponse } from '../types'

export function useAiCopilotActions() {
  const { i18n } = useTranslation()

  const invokeAction = async (action: AiCopilotActionDefinition, pageContext: AiCopilotPageContext): Promise<AiCopilotResponse> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        status: 'review_needed',
        page_id: pageContext.page_id,
        action: action.edgeAction,
        title: action.key,
        summary: 'Supabase is not configured.',
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: ['Supabase is not configured.'],
          warnings: [],
        },
      }
    }

    const { data, error } = await supabase.functions.invoke('ai-chef', {
      body: {
        action: action.edgeAction,
        requested_action: action.key,
        family_id: pageContext.selected_family_id,
        page_context: pageContext,
        planned_date: pageContext.selected_date,
        week_start: pageContext.selected_week,
        language: i18n.language.startsWith('es') ? 'es' : 'en',
      },
    })
    if (error) throw error
    return data as AiCopilotResponse
  }

  return { invokeAction }
}
