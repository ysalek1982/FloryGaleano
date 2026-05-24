import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import { shoppingItemStatus } from '../utils/shoppingFormatters'

export function useShoppingListState() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || 'all')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  return useMemo(() => {
    const familyIds = familyId === 'all' ? data.families.map((family) => family.id) : [familyId]
    const lists = data.shoppingLists.filter((list) => familyIds.includes(list.family_id))
    const activeList = lists[0]
    const familyPlanIds = new Set(data.menuPlans.filter((plan) => familyIds.includes(plan.family_id)).map((plan) => plan.id))
    const latestMenuUpdate = data.menuPlanItems
      .filter((item) => familyPlanIds.has(item.menu_plan_id))
      .map((item) => item.updated_at || item.created_at)
      .sort()
      .at(-1)
    const isStale = Boolean(activeList?.updated_at && latestMenuUpdate && latestMenuUpdate > activeList.updated_at)
    const items = data.shoppingListItems
      .filter((item) => !activeList || item.shopping_list_id === activeList.id)
      .map((item) => ({
        item,
        ingredient: data.ingredients.find((ingredient) => ingredient.id === item.ingredient_id),
        status: shoppingItemStatus(item),
      }))
    const grouped = items.reduce<Record<string, typeof items>>((acc, row) => {
      const category = row.ingredient?.category || 'uncategorized'
      acc[category] = [...(acc[category] || []), row]
      return acc
    }, {})
    const summary = {
      totalRequired: items.length,
      missing: items.filter((row) => row.item.missing_quantity > 0).length,
      covered: items.filter((row) => row.item.available_quantity >= row.item.required_quantity).length,
      pending: items.filter((row) => !row.item.is_checked).length,
      purchased: items.filter((row) => row.item.is_checked).length,
    }
    return {
      data,
      familyId,
      setFamilyId,
      lists,
      activeList,
      items,
      grouped,
      summary,
      isStale,
      editingItemId,
      setEditingItemId,
      editingItem: data.shoppingListItems.find((item) => item.id === editingItemId),
    }
  }, [data, editingItemId, familyId])
}
