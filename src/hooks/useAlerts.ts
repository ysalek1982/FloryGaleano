import { useMemo } from 'react'
import { useAppData } from '../lib/AppState'

export function useAlerts(familyId?: string) {
  const { data, markAlertRead, isDataLoading } = useAppData()
  const alerts = useMemo(
    () => data.alerts.filter((alert) => !familyId || alert.family_id === familyId),
    [data.alerts, familyId],
  )

  return {
    alerts,
    isLoading: isDataLoading,
    error: null as string | null,
    markAlertRead,
  }
}
