import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import type { Recipe } from '../../../lib/types'
import { todayIso } from '../../../lib/utils'
import { calculateProductionRows } from '../../../services/portionEngine'
import { isPantryExpiringSoon, isPantryLowStock, pantryStatus } from '../utils/pantryFormatters'

export function usePantryState() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || 'all')
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all')

  return useMemo(() => {
    const familyIds = familyId === 'all' ? data.families.map((family) => family.id) : [familyId]
    const allRows = data.pantryInventory
      .filter((item) => familyIds.includes(item.family_id))
      .map((item) => {
        const ingredient = data.ingredients.find((candidate) => candidate.id === item.ingredient_id)
        return {
          item,
          ingredient,
          status: pantryStatus(item),
          lowStock: isPantryLowStock(item),
          expiringSoon: isPantryExpiringSoon(item),
        }
      })
      .filter((row) => category === 'all' || row.ingredient?.category === category)
      .filter((row) => filter === 'all' || (filter === 'low' && row.lowStock) || (filter === 'expiring' && row.expiringSoon))

    const familyMenuPlans = data.menuPlans.filter((plan) => familyIds.includes(plan.family_id))
    const upcomingItems = data.menuPlanItems.filter((item) => {
      const plan = familyMenuPlans.find((candidate) => candidate.id === item.menu_plan_id)
      return Boolean(plan && item.planned_date >= todayIso())
    })
    const upcomingRecipes = upcomingItems
      .map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
    const diners = data.familyMembers.filter((diner) => familyIds.includes(diner.family_id) && diner.is_active)
    const productionRows = calculateProductionRows(upcomingRecipes, data.recipeIngredients, data.ingredients, diners, data.pantryInventory)
    const scopedPantryItems = data.pantryInventory.filter((item) => familyIds.includes(item.family_id))
    const categories = Array.from(new Set(data.ingredients.map((ingredient) => ingredient.category).filter(Boolean) as string[])).sort()
    const categorySummary = categories.map((name) => ({
      name,
      count: allRows.filter((row) => row.ingredient?.category === name).length,
      lowStock: allRows.filter((row) => row.ingredient?.category === name && row.lowStock).length,
    }))
    const usageRows = productionRows.map((row) => ({
      ...row,
      ingredient: data.ingredients.find((ingredient) => ingredient.id === row.ingredientId),
      pantryItems: data.pantryInventory.filter((item) => item.ingredient_id === row.ingredientId),
    }))

    return {
      data,
      familyId,
      setFamilyId,
      category,
      setCategory,
      filter,
      setFilter,
      rows: allRows,
      lowStockRows: scopedPantryItems.filter(isPantryLowStock),
      expiringRows: scopedPantryItems.filter(isPantryExpiringSoon),
      categories,
      categorySummary,
      productionRows,
      usageRows,
    }
  }, [category, data, familyId, filter])
}
