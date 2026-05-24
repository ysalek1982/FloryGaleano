import { useTranslation } from 'react-i18next'

import { Card, NutritionSnapshot as SharedNutritionSnapshot } from '../../shared/chefUi'

export function NutritionSnapshot() {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.nutritionSnapshot')}</h2>
      <SharedNutritionSnapshot />
    </Card>
  )
}
