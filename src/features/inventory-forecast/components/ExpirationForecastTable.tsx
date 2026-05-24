import { useTranslation } from 'react-i18next'

import { Card, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { AppData } from '../../../lib/types'
import type { InventoryForecast } from '../utils/inventoryForecastEngine'

export function ExpirationForecastTable({ forecast, data }: { forecast: InventoryForecast; data: AppData }) {
  const { t } = useTranslation()
  const ingredientById = new Map(data.ingredients.map((ingredient) => [ingredient.id, ingredient]))
  const recipeById = new Map(data.recipes.map((recipe) => [recipe.id, recipe]))
  const rows = [
    ...forecast.pantryExpiringSoon.map((item) => ({
      type: t('pantry.title'),
      item: ingredientById.get(item.ingredient_id)?.name || '',
      date: item.expiration_date || '',
      status: t('forecast.priorities.use_soon'),
    })),
    ...forecast.freezerExpiringSoon.map((item) => ({
      type: t('freezer.title'),
      item: recipeById.get(item.recipe_id)?.name || '',
      date: item.expiration_date || '',
      status: t('forecast.priorities.freezer_first'),
    })),
  ]

  return (
    <Card data-testid="expiration-forecast-panel">
      <h2 className="font-serif text-2xl font-semibold">{t('forecast.expirationForecast')}</h2>
      <div className="mt-4">
        {rows.length ? (
          <ResponsiveTable
            headers={[t('common.type'), t('common.item'), t('common.date'), t('common.status')]}
            rows={rows.map((row) => [row.type, row.item, row.date, row.status])}
          />
        ) : (
          <EmptyState text={t('forecast.noExpiringItems')} />
        )}
      </div>
    </Card>
  )
}
