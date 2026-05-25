import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button, Dialog, Field } from '../../shared/chefUi'
import { useCanWrite } from '../../shared/chefHooks'
import { useAppData } from '../../../lib/AppState'
import type { MealTime } from '../../../lib/types'
import { todayIso } from '../../../lib/utils'
import type { AiCopilotSuggestion } from '../types'
import { canApplyCopilotSuggestion, suggestionStatus } from '../utils/aiCopilotGuards'

export default function AiCopilotApplyDialog({
  suggestion,
  onClose,
  onApplied,
}: {
  suggestion: AiCopilotSuggestion
  onClose: () => void
  onApplied: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canWrite = useCanWrite()
  const { data, addMenuPlan, addMenuPlanItem, addShoppingList, addShoppingListItem } = useAppData()
  const [reason, setReason] = useState('')
  const status = suggestionStatus(suggestion)
  const applicable = canApplyCopilotSuggestion(suggestion, canWrite)
  const needsReason = status === 'review_needed'
  const dataPayload = suggestion.data || {}

  const apply = () => {
    if (!applicable) return
    if (suggestion.apply_option === 'open_settings') {
      navigate('/app/settings')
      onApplied()
      return
    }
    if (suggestion.apply_option === 'apply_menu_patch') {
      const recipeId = String(dataPayload.recipe_id || '')
      const recipe = data.recipes.find((item) => item.id === recipeId)
      if (!recipe) return
      const familyId = String(dataPayload.family_id || recipe.family_id || data.families[0]?.id || '')
      const plannedDate = String(dataPayload.planned_date || todayIso())
      const plan = data.menuPlans.find((item) => item.family_id === familyId && item.start_date <= plannedDate && item.end_date >= plannedDate)
        || addMenuPlan({ family_id: familyId, name: `${t('aiCopilot.appliedDraft')} ${plannedDate}`, start_date: plannedDate, end_date: plannedDate, status: 'draft' })
      addMenuPlanItem({
        menu_plan_id: plan.id,
        recipe_id: recipe.id,
        planned_date: plannedDate,
        meal_time: String(dataPayload.meal_time || 'dinner') as MealTime,
        allergy_status: status,
        variety_status: status === 'safe' ? 'allowed' : 'warning',
        notes: needsReason ? reason : t('aiCopilot.appliedFromCopilot'),
        ai_generated: true,
      })
      onApplied()
      return
    }
    if (suggestion.apply_option === 'create_shopping_item') {
      const familyId = String(dataPayload.family_id || data.families[0]?.id || '')
      const activeList = data.shoppingLists.find((item) => item.family_id === familyId && item.status === 'active')
        || addShoppingList({ family_id: familyId, name: t('shopping.title'), status: 'active' })
      addShoppingListItem({
        shopping_list_id: activeList.id,
        ingredient_id: String(dataPayload.ingredient_id),
        required_quantity: Number(dataPayload.quantity || 0),
        available_quantity: 0,
        missing_quantity: Number(dataPayload.quantity || 0),
        unit: String(dataPayload.unit || 'g'),
        notes: needsReason ? reason : t('aiCopilot.appliedFromCopilot'),
      })
      onApplied()
    }
  }

  return (
    <Dialog title={t('aiCopilot.applyDialogTitle')} onClose={onClose}>
      <div className="grid gap-4" data-testid="ai-copilot-apply-dialog">
        <p className="text-sm text-slate-600">{t('aiCopilot.applyDialogBody')}</p>
        <pre className="max-h-56 overflow-auto rounded-md bg-stone-50 p-3 text-xs text-slate-700">{JSON.stringify({
          title: suggestion.title,
          status,
          apply_option: suggestion.apply_option,
          data: dataPayload,
        }, null, 2)}</pre>
        {!applicable && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{t('aiCopilot.applyMissingData')}</p>}
        {needsReason && (
          <Field label={t('aiCopilot.reviewReason')}>
            <textarea className="input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} data-testid="ai-copilot-review-reason" />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="button" variant="ai" disabled={!applicable || (needsReason && reason.trim().length < 4)} onClick={apply} data-testid="ai-copilot-confirm-apply">
            {t('aiCopilot.confirmApply')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
