import { Flame, HeartPulse, Wheat, Droplets } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MetricCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useNutritionView } from '../hooks/useNutritionView'

type NutritionView = ReturnType<typeof useNutritionView>

export function NutritionSummaryCards({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t('common.calories')} value={formatNumber(nutrition.familyDaily.calories)} icon={Flame} />
      <MetricCard label={t('common.protein')} value={`${formatNumber(nutrition.familyDaily.protein_g)}g`} icon={HeartPulse} />
      <MetricCard label={t('common.carbs')} value={`${formatNumber(nutrition.familyDaily.carbs_g)}g`} icon={Wheat} />
      <MetricCard label={t('common.sodium')} value={`${formatNumber(nutrition.familyDaily.sodium_mg)}mg`} icon={Droplets} tone="warning" />
    </div>
  )
}
