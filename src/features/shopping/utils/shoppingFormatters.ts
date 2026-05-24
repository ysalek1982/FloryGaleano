import type { ShoppingListItem } from '../../../lib/types'
import { formatNumber } from '../../../lib/utils'

export function formatShoppingQuantity(value: number, unit = 'g') {
  return `${formatNumber(value)} ${unit}`
}

export function shoppingItemStatus(item: ShoppingListItem) {
  if (item.is_checked) return 'purchased'
  if (item.missing_quantity > 0) return 'missing'
  return 'covered'
}
