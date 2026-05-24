import type { PantryInventory } from '../../../lib/types'
import { addDays, daysBetween, formatNumber, safeDate, todayIso } from '../../../lib/utils'

export type PantryStatus = 'low_stock' | 'expiring_soon' | 'ready'

export function isPantryLowStock(item: PantryInventory) {
  return Number(item.quantity_available) < Number(item.min_quantity_alert)
}

export function isPantryExpiringSoon(item: PantryInventory, windowDays = 7) {
  const expiration = safeDate(item.expiration_date)
  return Boolean(expiration && expiration <= addDays(todayIso(), windowDays) && daysBetween(todayIso(), expiration) >= 0)
}

export function pantryStatus(item: PantryInventory): PantryStatus {
  if (isPantryLowStock(item)) return 'low_stock'
  if (isPantryExpiringSoon(item)) return 'expiring_soon'
  return 'ready'
}

export function formatPantryQuantity(quantity: number, unit = 'g') {
  return `${formatNumber(quantity)} ${unit}`
}
