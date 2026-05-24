import { useMemo } from 'react'

import { useAppData } from '../../../lib/AppState'
import { calculateInventoryForecast } from '../utils/inventoryForecastEngine'

export function useInventoryForecast(familyId: string) {
  const { data } = useAppData()
  return useMemo(() => {
    const family = familyId === 'all' ? data.families[0] : data.families.find((item) => item.id === familyId)
    return {
      data,
      family,
      forecast: calculateInventoryForecast(data, family),
    }
  }, [data, familyId])
}
