import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export function useDiners(familyId?: string) {
  const { data, addDiner, updateDiner, addAllergy, addDietaryRestriction, addFoodPreference, isDataLoading } = useAppData()
  const diners = useMemo(
    () => data.familyMembers.filter((diner) => !familyId || diner.family_id === familyId),
    [data.familyMembers, familyId],
  )

  return {
    diners,
    isLoading: isDataLoading,
    error: null as string | null,
    addDiner,
    updateDiner,
    addAllergy,
    addDietaryRestriction,
    addFoodPreference,
  }
}
