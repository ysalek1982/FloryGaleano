import type { AiCopilotActionDefinition, AiCopilotPageId } from '../types'

export const aiCopilotActions: AiCopilotActionDefinition[] = [
  action('dashboard.summarizeRisks', 'dashboard', 'summarize_current_context', 'brain'),
  action('dashboard.nextAction', 'dashboard', 'suggest_next_action', 'sparkles'),
  action('dashboard.explainAlerts', 'dashboard', 'explain_current_page', 'shield'),
  action('ingredients.suggestCategory', 'ingredients', 'contextual_suggestion', 'sparkles'),
  action('ingredients.detectAllergens', 'ingredients', 'contextual_suggestion', 'shield'),
  action('ingredients.suggestSubstitutions', 'ingredients', 'suggest_substitutions', 'sparkles'),
  action('recipes.improveRecipe', 'recipes', 'contextual_suggestion', 'sparkles'),
  action('recipes.checkSafety', 'recipes', 'contextual_suggestion', 'shield'),
  action('recipes.safeVariation', 'recipes', 'create_recipe', 'sparkles'),
  action('menuPlanner.generateWeek', 'menu_planner', 'generate_validated_menu_plan', 'brain'),
  action('menuPlanner.completeSlots', 'menu_planner', 'generate_validated_menu_plan', 'sparkles'),
  action('menuPlanner.repairUnsafe', 'menu_planner', 'repair_menu_plan', 'shield'),
  action('menuPlanner.improveVariety', 'menu_planner', 'calculate_menu_improvements', 'sparkles'),
  action('dayPlanner.completeDay', 'day_planner', 'generate_day_menu', 'brain'),
  action('dayPlanner.sportSnack', 'day_planner', 'contextual_suggestion', 'sparkles'),
  action('dayPlanner.repairDay', 'day_planner', 'repair_current_item', 'shield'),
  action('portionCalculator.explainGrams', 'portion_calculator', 'explain_current_page', 'report'),
  action('portionCalculator.batchSize', 'portion_calculator', 'contextual_suggestion', 'sparkles'),
  action('pantry.usePantry', 'pantry', 'pantry_aware_meals', 'inventory'),
  action('pantry.expiringItems', 'pantry', 'contextual_suggestion', 'inventory'),
  action('freezer.freezerFirst', 'freezer', 'freezer_first_meals', 'inventory'),
  action('freezer.reheatingPlan', 'freezer', 'contextual_suggestion', 'inventory'),
  action('shopping.prioritize', 'shopping_list', 'purchase_priority', 'shopping'),
  action('shopping.explainMissing', 'shopping_list', 'explain_missing_items', 'shopping'),
  action('allergies.testIngredient', 'allergies', 'contextual_suggestion', 'shield'),
  action('allergies.safeAlternative', 'allergies', 'suggest_substitutions', 'shield'),
  action('nutrition.explainGaps', 'nutrition', 'explain_current_page', 'report'),
  action('nutrition.highProteinMeal', 'nutrition', 'contextual_suggestion', 'sparkles'),
  action('alerts.explainAlerts', 'alerts', 'explain_current_page', 'shield'),
  action('alerts.nextResolution', 'alerts', 'suggest_next_action', 'sparkles'),
  action('reports.summarize', 'reports', 'summarize_current_context', 'report'),
  action('reports.explainWarnings', 'reports', 'explain_current_page', 'report'),
  action('settings.explainGemini', 'settings', 'explain_current_page', 'settings'),
  action('settings.testKey', 'settings', 'contextual_suggestion', 'settings'),
]

export function getAiCopilotActions(pageId: AiCopilotPageId) {
  return aiCopilotActions.filter((item) => item.pageIds.includes(pageId))
}

export function getAiCopilotAction(key: string) {
  return aiCopilotActions.find((item) => item.key === key)
}

function action(
  key: string,
  pageId: AiCopilotPageId,
  edgeAction: string,
  icon: AiCopilotActionDefinition['icon'],
): AiCopilotActionDefinition {
  return {
    key,
    labelKey: `aiCopilot.actions.${key}.label`,
    descriptionKey: `aiCopilot.actions.${key}.description`,
    edgeAction,
    pageIds: [pageId],
    icon,
  }
}
