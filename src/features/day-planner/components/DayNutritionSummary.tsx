import { useTranslation } from 'react-i18next'

import { Badge, Card } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayNutritionSummary({ state }: { state: DayPlannerState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.nutritionSummary')}</h2>
      <div className="mt-4 grid gap-3">
        {state.diners.map((diner) => {
          const items = state.dayItems.filter((item) => !item.family_member_id || item.family_member_id === diner.id)
          const calories = items.reduce((sum, item) => sum + (item.calories ?? 0) * diner.portion_factor, 0)
          const protein = items.reduce((sum, item) => sum + (item.protein_g ?? 0) * diner.portion_factor, 0)
          return (
            <div key={diner.id} className="rounded-md border border-stone-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{diner.full_name}</span>
                <Badge status={calories >= (diner.daily_calorie_target ?? 0) * 0.85 ? 'safe' : 'warning'}>
                  {calories >= (diner.daily_calorie_target ?? 0) * 0.85 ? t('nutrition.adequate') : t('nutrition.low')}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{formatNumber(calories)} {t('common.calories')} - {formatNumber(protein)}g {t('common.protein')}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
