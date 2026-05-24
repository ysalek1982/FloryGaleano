import { useTranslation } from 'react-i18next'

import { Card, EmptyState } from '../../shared/chefUi'
import { mealTimes } from '../../shared/chefUtils'
import type { useDayPlannerState } from '../hooks/useDayPlannerState'
import { DayMealSlotCard } from './DayMealSlotCard'

type DayPlannerState = ReturnType<typeof useDayPlannerState>

export function DayMealTimeline({
  state,
  onRemove,
}: {
  state: DayPlannerState
  onRemove: (itemId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dayPlanner.timeline')}</h2>
      <div className="mt-4 grid gap-3">
        {mealTimes.map((mealTime) => {
          const item = state.dayItems.find((candidate) => candidate.meal_time === mealTime)
          const recipe = item ? state.data.recipes.find((candidate) => candidate.id === item.recipe_id) : undefined
          return (
            <DayMealSlotCard
              key={mealTime}
              mealTime={mealTime}
              item={item}
              recipe={recipe}
              onAdd={() => {
                state.setError('')
                state.setSlot({ date: state.date, mealTime })
              }}
              onRemove={onRemove}
            />
          )
        })}
        {state.dayItems.length === 0 && <EmptyState text={t('dayPlanner.noMealsPlanned')} />}
      </div>
    </Card>
  )
}
