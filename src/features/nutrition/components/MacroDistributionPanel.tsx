import { useTranslation } from 'react-i18next'

import { Card, ResponsiveTable } from '../../shared/chefUi'
import type { useNutritionView } from '../hooks/useNutritionView'
import { nutrientRows } from '../utils/nutritionFormatters'

type NutritionView = ReturnType<typeof useNutritionView>

export function MacroDistributionPanel({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('nutrition.macroDistribution')}</h2>
      <div className="mt-4">
        <ResponsiveTable headers={[t('nutrition.nutrient'), t('common.quantity')]} rows={nutrientRows(t, nutrition.familyDaily)} />
      </div>
    </Card>
  )
}
