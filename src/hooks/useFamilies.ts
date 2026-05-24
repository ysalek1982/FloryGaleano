import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export function useFamilies() {
  const { data, addFamily, updateFamily, isDataLoading } = useAppData()

  return useMemo(() => ({
    families: data.families,
    isLoading: isDataLoading,
    error: null as string | null,
    addFamily,
    updateFamily,
  }), [addFamily, data.families, isDataLoading, updateFamily])
}
