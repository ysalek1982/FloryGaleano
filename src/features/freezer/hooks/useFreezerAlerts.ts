import type { FreezerInventory } from '../../../lib/types'
import { isFreezerExpiringSoon, isFreezerLowPortion } from '../utils/freezerFormatters'

export function useFreezerAlerts(items: FreezerInventory[]) {
  return {
    expiringSoon: items.filter(isFreezerExpiringSoon),
    lowPortions: items.filter(isFreezerLowPortion),
  }
}
