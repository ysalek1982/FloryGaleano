import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useAppData } from '../../../lib/AppState'
import type { FreezerInventory } from '../../../lib/types'
import { addDays, safeDate, todayIso } from '../../../lib/utils'
import { Button, Dialog, Field } from '../../shared/chefUi'

const freezerItemSchema = z.object({
  family_id: z.string().min(1),
  recipe_id: z.string().min(1),
  prepared_date: z.string().min(1),
  expiration_date: z.string().min(1),
  portions_available: z.coerce.number().min(0),
  grams_per_portion: z.coerce.number().min(0),
  reheating_instructions: z.string().optional(),
  storage_notes: z.string().optional(),
})

export function FreezerItemDialog({
  item,
  onClose,
  onSubmit,
}: {
  item?: FreezerInventory
  onClose: () => void
  onSubmit: (values: Partial<FreezerInventory>) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const form = useForm<z.input<typeof freezerItemSchema>, unknown, z.output<typeof freezerItemSchema>>({
    resolver: zodResolver(freezerItemSchema),
    defaultValues: {
      family_id: item?.family_id || data.families[0]?.id || '',
      recipe_id: item?.recipe_id || data.recipes[0]?.id || '',
      prepared_date: safeDate(item?.prepared_date) || todayIso(),
      expiration_date: safeDate(item?.expiration_date) || addDays(todayIso(), 30),
      portions_available: item?.portions_available ?? 1,
      grams_per_portion: item?.grams_per_portion ?? 250,
      reheating_instructions: item?.reheating_instructions || '',
      storage_notes: item?.storage_notes || '',
    },
  })

  return (
    <Dialog title={item ? t('common.edit') : t('freezer.addItem')} onClose={onClose}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="freezer-form">
        <Field label={t('common.family')}>
          <select className="input" {...form.register('family_id')}>
            {data.families.map((family) => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('common.recipe')}>
          <select className="input" {...form.register('recipe_id')}>
            {data.recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t('freezer.preparedDate')}>
            <input className="input" type="date" {...form.register('prepared_date')} />
          </Field>
          <Field label={t('freezer.expirationDate')}>
            <input className="input" type="date" {...form.register('expiration_date')} />
          </Field>
          <Field label={t('freezer.portionsAvailable')}>
            <input className="input" type="number" {...form.register('portions_available')} />
          </Field>
          <Field label={t('freezer.gramsPerPortion')}>
            <input className="input" type="number" {...form.register('grams_per_portion')} />
          </Field>
        </div>
        <Field label={t('recipes.reheating')}>
          <textarea className="input min-h-20" {...form.register('reheating_instructions')} />
        </Field>
        <Field label={t('freezer.storageNotes')}>
          <textarea className="input min-h-20" {...form.register('storage_notes')} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
