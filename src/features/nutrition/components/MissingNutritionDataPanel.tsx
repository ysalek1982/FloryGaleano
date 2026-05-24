import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import type { useNutritionView } from '../hooks/useNutritionView'

type NutritionView = ReturnType<typeof useNutritionView>

export function MissingNutritionDataPanel({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  const rows = [
    ...nutrition.missingIngredients.map((ingredient) => ({ id: ingredient.id, name: ingredient.name, type: t('common.ingredient') })),
    ...nutrition.missingRecipes.map((recipe) => ({ id: recipe.id, name: recipe.name, type: t('common.recipe') })),
  ]
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('nutrition.missingNutritionData')}</h2>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <EmptyState text={t('nutrition.noMissingData')} />
        ) : (
          rows.slice(0, 8).map((row) => (
            <div key={`${row.type}-${row.id}`} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
              <span className="font-semibold text-slate-900">{row.name}</span>
              <Badge status="warning">{row.type}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
