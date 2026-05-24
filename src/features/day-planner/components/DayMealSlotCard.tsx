import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import MealSlotContent from '../../menu-planner/components/MealSlotContent'
import { Badge, Button, ReadOnlyNotice } from '../../shared/chefUi'
import { useCanWrite } from '../../shared/chefHooks'
import type { MealTime, MenuPlanItem, Recipe } from '../../../lib/types'
import { daySlotTestId } from '../utils/dayPlannerFormatters'

export function DayMealSlotCard({
  mealTime,
  item,
  recipe,
  onAdd,
  onRemove,
}: {
  mealTime: MealTime
  item?: MenuPlanItem
  recipe?: Recipe
  onAdd: () => void
  onRemove: (itemId: string) => void
}) {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4" data-testid={daySlotTestId(mealTime)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl font-semibold">{t(`planner.${mealTime}`)}</h3>
        {item && <Badge status={item.allergy_status}>{t(item.allergy_status === 'review_needed' ? 'common.reviewNeeded' : `common.${item.allergy_status}`)}</Badge>}
      </div>
      <div className="mt-3">
        {item && recipe ? (
          <>
            <MealSlotContent item={item} recipe={recipe} />
            {canWrite && (
              <Button className="mt-3" variant="ghost" onClick={() => onRemove(item.id)}>
                <Trash2 className="h-4 w-4" />
                {t('dayPlanner.removeRecipe')}
              </Button>
            )}
          </>
        ) : canWrite ? (
          <Button variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {t('planner.addRecipe')}
          </Button>
        ) : (
          <ReadOnlyNotice />
        )}
      </div>
    </div>
  )
}
