import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import { freezerStatus, isFreezerExpiringSoon, isFreezerLowPortion } from '../utils/freezerFormatters'

export function useFreezerState() {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || 'all')
  const [filter, setFilter] = useState<'all' | 'expiring' | 'low'>('all')

  return useMemo(() => {
    const familyIds = familyId === 'all' ? data.families.map((family) => family.id) : [familyId]
    const scopedItems = data.freezerInventory.filter((item) => familyIds.includes(item.family_id))
    const rows = scopedItems
      .map((item) => ({
        item,
        recipe: data.recipes.find((recipe) => recipe.id === item.recipe_id),
        status: freezerStatus(item),
        expiringSoon: isFreezerExpiringSoon(item),
        lowPortions: isFreezerLowPortion(item),
      }))
      .filter((row) => filter === 'all' || (filter === 'expiring' && row.expiringSoon) || (filter === 'low' && row.lowPortions))
    const freezerFriendlyRecipes = data.recipes.filter((recipe) => recipe.is_freezer_friendly && !scopedItems.some((item) => item.recipe_id === recipe.id))

    return {
      data,
      familyId,
      setFamilyId,
      filter,
      setFilter,
      rows,
      scopedItems,
      expiringRows: scopedItems.filter(isFreezerExpiringSoon),
      lowPortionRows: scopedItems.filter(isFreezerLowPortion),
      freezerFriendlyRecipes,
    }
  }, [data, familyId, filter])
}
