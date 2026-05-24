import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export function useMenuPlans(familyId?: string) {
  const { data, addMenuPlan, addMenuPlanItem, isDataLoading } = useAppData()
  const menuPlans = useMemo(
    () => data.menuPlans.filter((plan) => !familyId || plan.family_id === familyId),
    [data.menuPlans, familyId],
  )
  const menuPlanIds = new Set(menuPlans.map((plan) => plan.id))
  const menuPlanItems = data.menuPlanItems.filter((item) => menuPlanIds.has(item.menu_plan_id))

  return {
    menuPlans,
    menuPlanItems,
    isLoading: isDataLoading,
    error: null as string | null,
    addMenuPlan,
    addMenuPlanItem,
  }
}
