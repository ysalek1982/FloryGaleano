import type { FreezerInventory } from '../../../lib/types'
import { addDays, daysBetween, safeDate, todayIso } from '../../../lib/utils'

export function isFreezerExpiringSoon(item: FreezerInventory, windowDays = 14) {
  const expiration = safeDate(item.expiration_date)
  return Boolean(expiration && expiration <= addDays(todayIso(), windowDays) && daysBetween(todayIso(), expiration) >= 0)
}

export function isFreezerLowPortion(item: FreezerInventory) {
  return Number(item.portions_available) <= 2
}

export function freezerStatus(item: FreezerInventory) {
  if (isFreezerExpiringSoon(item)) return 'expiring_soon'
  if (isFreezerLowPortion(item)) return 'low_portions'
  return 'ready'
}
