import type { TFunction } from 'i18next'
import type { NutritionTotals } from '../../../lib/types'
import { formatNumber } from '../../../lib/utils'

export function nutritionStatus(value: number, target = 0) {
  if (!target) return 'adequate'
  if (value < target * 0.85) return 'low'
  if (value > target * 1.15) return 'high'
  return 'adequate'
}

export function nutritionStatusLabel(t: TFunction, status: string) {
  return t(status === 'low' ? 'nutrition.low' : status === 'high' ? 'nutrition.high' : 'nutrition.adequate')
}

export function nutrientRows(t: TFunction, nutrition: NutritionTotals) {
  return [
    [t('common.calories'), formatNumber(nutrition.calories)],
    [t('common.protein'), `${formatNumber(nutrition.protein_g)}g`],
    [t('common.carbs'), `${formatNumber(nutrition.carbs_g)}g`],
    [t('common.fat'), `${formatNumber(nutrition.fat_g)}g`],
    [t('common.fiber'), `${formatNumber(nutrition.fiber_g)}g`],
    [t('common.sugar'), `${formatNumber(nutrition.sugar_g)}g`],
    [t('common.sodium'), `${formatNumber(nutrition.sodium_mg)}mg`],
    [t('common.calcium'), `${formatNumber(nutrition.calcium_mg)}mg`],
    [t('common.iron'), `${formatNumber(nutrition.iron_mg, 1)}mg`],
  ]
}
