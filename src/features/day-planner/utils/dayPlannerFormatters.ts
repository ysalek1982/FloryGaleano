import type { MealTime } from '../../../lib/types'

export function daySlotTestId(mealTime: MealTime) {
  return `day-slot-${mealTime}`
}
