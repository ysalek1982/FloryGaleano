import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import { DayAiSuggestionsPanel } from '../../features/day-planner/components/DayAiSuggestionsPanel'
import { DayAlertsPanel } from '../../features/day-planner/components/DayAlertsPanel'
import { DayAllergySummary } from '../../features/day-planner/components/DayAllergySummary'
import { DayMealTimeline } from '../../features/day-planner/components/DayMealTimeline'
import { DayMissingIngredientsPanel } from '../../features/day-planner/components/DayMissingIngredientsPanel'
import { DayNutritionSummary } from '../../features/day-planner/components/DayNutritionSummary'
import { DayPlannerToolbar } from '../../features/day-planner/components/DayPlannerToolbar'
import { DayPrintSummary } from '../../features/day-planner/components/DayPrintSummary'
import { useDayMealActions } from '../../features/day-planner/hooks/useDayMealActions'
import { type DayAiSuggestion, useDayPlannerState } from '../../features/day-planner/hooks/useDayPlannerState'
import AddRecipeToSlotDialog from '../../features/menu-planner/components/AddRecipeToSlotDialog'
import { Card, PageHeader } from '../../features/shared/chefUi'
import { mealTimes } from '../../features/shared/chefUtils'
import { useAppData } from '../../lib/AppState'

export default function DayPlannerPage() {
  const { t } = useTranslation()
  const state = useDayPlannerState()
  const { addRecipeToSlot, removeMenuPlanItem } = useDayMealActions()
  const { data } = useAppData()

  const applySuggestion = (suggestion: DayAiSuggestion) => {
    if (suggestion.safety_status !== 'safe' || suggestion.usable !== true) {
      state.setError(t('ai.reviewNeededStructuredData'))
      return
    }
    const recipe = suggestion.recipe_id
      ? data.recipes.find((candidate) => candidate.id === suggestion.recipe_id)
      : data.recipes.find((candidate) => candidate.name === suggestion.title)
    if (!recipe?.id) {
      state.setError(t('ai.reviewNeededStructuredData'))
      return
    }
    const mealTime = suggestion.meal_time || mealTimes.find((candidate) => !state.dayItems.some((item) => item.meal_time === candidate)) || 'dinner'
    addRecipeToSlot({
      familyId: state.familyId,
      date: state.date,
      mealTime,
      recipeId: recipe.id,
      dinerId: 'all',
      onError: state.setError,
    })
  }

  return (
    <>
      <PageHeader
        title={t('nav.dayPlanner')}
        subtitle={t('dayPlanner.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            <AiCopilotButton
              compact
              context={{ page_id: 'day_planner', selected_family_id: state.familyId, selected_date: state.date, selected_menu_plan_id: state.plan?.id, relevant_records: { planned_meals: state.dayItems.length } }}
              actionKey="dayPlanner.completeDay"
              labelKey="aiCopilot.actions.dayPlanner.completeDay.label"
              testId="day-ai-complete"
            />
            <AiCopilotButton
              compact
              context={{ page_id: 'day_planner', selected_family_id: state.familyId, selected_date: state.date, selected_menu_plan_id: state.plan?.id, relevant_records: { planned_meals: state.dayItems.length } }}
              actionKey="dayPlanner.sportSnack"
              labelKey="aiCopilot.actions.dayPlanner.sportSnack.label"
              testId="day-ai-sport-snack"
            />
          </div>
        )}
      />
      <div className="grid gap-5">
        <DayPlannerToolbar state={state} />
        {state.error && <Card className="border-danger-200 bg-danger-50 text-danger-800">{state.error}</Card>}
        <DayPrintSummary state={state} />
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <DayMealTimeline state={state} onRemove={removeMenuPlanItem} />
          <div className="grid gap-5">
            <DayNutritionSummary state={state} />
            <DayAllergySummary state={state} />
            <DayMissingIngredientsPanel state={state} />
            <DayAlertsPanel state={state} />
            <DayAiSuggestionsPanel state={state} onApply={applySuggestion} />
          </div>
        </div>
      </div>
      {state.slot && (
        <AddRecipeToSlotDialog
          familyId={state.familyId}
          slot={state.slot}
          plan={state.plan}
          onClose={() => state.setSlot(null)}
          onSubmit={({ recipeId, dinerId, overrideReason }) => {
            addRecipeToSlot({
              familyId: state.familyId,
              date: state.slot?.date || state.date,
              mealTime: state.slot?.mealTime || 'dinner',
              recipeId,
              dinerId,
              overrideReason,
              onError: state.setError,
            })
            state.setSlot(null)
          }}
        />
      )}
    </>
  )
}
