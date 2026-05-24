import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { FreezerInventory, MealTime } from '../../../lib/types'
import { todayIso } from '../../../lib/utils'
import { Button, Dialog, Field } from '../../shared/chefUi'

const freezerMenuSchema = z.object({
  planned_date: z.string().min(1),
  meal_time: z.enum(['breakfast', 'school_lunch', 'lunch', 'snack', 'sport_snack', 'dinner', 'evening_snack']),
})

const mealTimes: MealTime[] = ['breakfast', 'school_lunch', 'lunch', 'snack', 'sport_snack', 'dinner', 'evening_snack']

export function FreezerUseInMenuDialog({
  item,
  onClose,
  onSubmit,
}: {
  item: FreezerInventory
  onClose: () => void
  onSubmit: (values: z.output<typeof freezerMenuSchema>) => void
}) {
  const { t } = useTranslation()
  const form = useForm<z.input<typeof freezerMenuSchema>, unknown, z.output<typeof freezerMenuSchema>>({
    resolver: zodResolver(freezerMenuSchema),
    defaultValues: {
      planned_date: todayIso(),
      meal_time: 'dinner',
    },
  })

  return (
    <Dialog title={t('freezer.addToMenu')} onClose={onClose}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="freezer-menu-form">
        <Field label={t('common.date')}>
          <input className="input" type="date" {...form.register('planned_date')} />
        </Field>
        <Field label={t('common.meal')}>
          <select className="input" {...form.register('meal_time')}>
            {mealTimes.map((mealTime) => <option key={mealTime} value={mealTime}>{t(`planner.${mealTime}`)}</option>)}
          </select>
        </Field>
        <p className="rounded-md bg-stone-50 p-3 text-sm text-slate-600">
          {t('freezer.useInMenuBody', { portions: item.portions_available })}
        </p>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
