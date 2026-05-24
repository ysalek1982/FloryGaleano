import { useTranslation } from 'react-i18next'

import { Badge, TableCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useNutritionView } from '../hooks/useNutritionView'
import { nutritionStatusLabel } from '../utils/nutritionFormatters'

type NutritionView = ReturnType<typeof useNutritionView>

export function DinerNutritionTable({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <TableCard
      title={t('nutrition.dailyByDiner')}
      headers={[t('common.diner'), t('common.calories'), t('diners.calorieTarget'), t('common.protein'), t('diners.proteinTarget'), t('common.status')]}
      rows={nutrition.dinerRows.map((row) => [
        row.diner.full_name,
        formatNumber(row.daily.calories),
        `${formatNumber(row.diner.daily_calorie_target ?? 0)}`,
        `${formatNumber(row.daily.protein_g)}g`,
        `${formatNumber(row.diner.daily_protein_target_g ?? 0)}g`,
        <span key="status" className="inline-flex gap-2">
          <Badge status={row.calorieStatus === 'adequate' ? 'safe' : 'warning'}>{nutritionStatusLabel(t, row.calorieStatus)}</Badge>
          <Badge status={row.proteinStatus === 'adequate' ? 'safe' : 'warning'}>{nutritionStatusLabel(t, row.proteinStatus)}</Badge>
        </span>,
      ])}
    />
  )
}
