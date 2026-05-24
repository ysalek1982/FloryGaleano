import { useTranslation } from 'react-i18next'

import { useAppData } from '../../../lib/AppState'
import type { Recipe } from '../../../lib/types'
import { uid } from '../../../lib/utils'
import { calculateProductionRows } from '../../../services/portionEngine'

export function useShoppingListGeneration(familyId: string) {
  const { t } = useTranslation()
  const { data, setData } = useAppData()

  const generate = (familyIdOverride = familyId) => {
    const family = familyIdOverride === 'all' ? data.families[0] : data.families.find((item) => item.id === familyIdOverride)
    if (!family) return
    const plans = data.menuPlans.filter((plan) => plan.family_id === family.id)
    const activePlan = plans[0]
    const planIds = new Set(plans.map((plan) => plan.id))
    const planItems = data.menuPlanItems.filter((item) => planIds.has(item.menu_plan_id))
    const diners = data.familyMembers.filter((diner) => diner.family_id === family.id && diner.is_active)
    const recipes = planItems
      .map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
    const rows = calculateProductionRows(recipes, data.recipeIngredients, data.ingredients, diners, data.pantryInventory.filter((item) => item.family_id === family.id))

    setData((current) => {
      const existing = current.shoppingLists.find((list) => list.family_id === family.id)
      const generatedAt = new Date().toISOString()
      const list = existing || {
        id: uid('shopping-list'),
        family_id: family.id,
        menu_plan_id: activePlan?.id,
        name: t('shopping.title'),
        status: 'active' as const,
        created_at: generatedAt,
        updated_at: generatedAt,
      }
      const nextList = { ...list, menu_plan_id: activePlan?.id || list.menu_plan_id, updated_at: generatedAt }
      return {
        ...current,
        shoppingLists: existing ? current.shoppingLists.map((item) => item.id === nextList.id ? nextList : item) : [nextList, ...current.shoppingLists],
        shoppingListItems: [
          ...current.shoppingListItems.filter((item) => item.shopping_list_id !== nextList.id),
          ...rows.map((row) => ({
            id: uid('shopping-item'),
            shopping_list_id: nextList.id,
            ingredient_id: row.ingredientId,
            required_quantity: row.requiredQuantity,
            available_quantity: row.availableQuantity,
            missing_quantity: row.missingQuantity,
            unit: row.unit,
            is_checked: false,
            notes: row.missingQuantity > 0 ? t('shopping.purchaseNeeded') : t('shopping.coveredByPantry'),
            created_at: new Date().toISOString(),
          })),
        ],
      }
    })
  }

  return { generate }
}
