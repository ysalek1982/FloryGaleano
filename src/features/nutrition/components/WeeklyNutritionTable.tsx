import { useTranslation } from 'react-i18next'

import { TableCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useNutritionView } from '../hooks/useNutritionView'

type NutritionView = ReturnType<typeof useNutritionView>

export function WeeklyNutritionTable({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <TableCard
      title={t('nutrition.weeklyByDiner')}
      headers={[t('common.diner'), t('common.calories'), t('common.protein'), t('common.carbs'), t('common.fat'), t('common.fiber'), t('common.sugar'), t('common.sodium')]}
      rows={nutrition.dinerRows.map((row) => [
        row.diner.full_name,
        formatNumber(row.weekly.calories),
        `${formatNumber(row.weekly.protein_g)}g`,
        `${formatNumber(row.weekly.carbs_g)}g`,
        `${formatNumber(row.weekly.fat_g)}g`,
        `${formatNumber(row.weekly.fiber_g)}g`,
        `${formatNumber(row.weekly.sugar_g)}g`,
        `${formatNumber(row.weekly.sodium_mg)}mg`,
      ])}
    />
  )
}
