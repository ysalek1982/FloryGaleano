import { useState } from 'react'

import { useAppData } from '../../../lib/AppState'

export function useAlertActions() {
  const { markAlertRead, markAllAlertsRead } = useAppData()
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => new Set())

  const markRead = (alertId: string) => {
    setLocalReadIds((current) => new Set(current).add(alertId))
    markAlertRead(alertId)
  }

  const markAllRead = (alertIds: string[]) => {
    setLocalReadIds((current) => {
      const next = new Set(current)
      alertIds.forEach((id) => next.add(id))
      return next
    })
    markAllAlertsRead(alertIds)
  }

  return { localReadIds, markRead, markAllRead }
}
