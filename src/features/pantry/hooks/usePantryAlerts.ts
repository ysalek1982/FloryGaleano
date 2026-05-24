import type { PantryInventory } from '../../../lib/types'
import { isPantryExpiringSoon, isPantryLowStock } from '../utils/pantryFormatters'

export function usePantryAlerts(items: PantryInventory[]) {
  return {
    lowStock: items.filter(isPantryLowStock),
    expiringSoon: items.filter(isPantryExpiringSoon),
  }
}
