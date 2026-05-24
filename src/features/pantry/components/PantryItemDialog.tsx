import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useAppData } from '../../../lib/AppState'
import type { PantryInventory } from '../../../lib/types'
import { safeDate } from '../../../lib/utils'
import { Button, Dialog, Field } from '../../shared/chefUi'

const pantryItemSchema = z.object({
  family_id: z.string().min(1),
  ingredient_id: z.string().min(1),
  quantity_available: z.coerce.number().min(0),
  unit: z.string().min(1),
  min_quantity_alert: z.coerce.number().min(0),
  expiration_date: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export function PantryItemDialog({
  item,
  onClose,
  onSubmit,
}: {
  item?: PantryInventory
  onClose: () => void
  onSubmit: (values: Partial<PantryInventory>) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const form = useForm<z.input<typeof pantryItemSchema>, unknown, z.output<typeof pantryItemSchema>>({
    resolver: zodResolver(pantryItemSchema),
    defaultValues: {
      family_id: item?.family_id || data.families[0]?.id || '',
      ingredient_id: item?.ingredient_id || data.ingredients[0]?.id || '',
      quantity_available: item?.quantity_available ?? 0,
      unit: item?.unit || 'g',
      min_quantity_alert: item?.min_quantity_alert ?? 0,
      expiration_date: safeDate(item?.expiration_date),
      location: item?.location || '',
      notes: item?.notes || '',
    },
  })

  return (
    <Dialog title={item ? t('common.edit') : t('pantry.addStock')} onClose={onClose}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="pantry-form">
        <Field label={t('common.family')}>
          <select className="input" {...form.register('family_id')}>
            {data.families.map((family) => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('common.ingredient')}>
          <select className="input" {...form.register('ingredient_id')}>
            {data.ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t('common.available')}>
            <input className="input" type="number" {...form.register('quantity_available')} />
          </Field>
          <Field label={t('common.unit')}>
            <input className="input" {...form.register('unit')} />
          </Field>
          <Field label={t('pantry.minimumAlert')}>
            <input className="input" type="number" {...form.register('min_quantity_alert')} />
          </Field>
          <Field label={t('pantry.expirationDate')}>
            <input className="input" type="date" {...form.register('expiration_date')} />
          </Field>
        </div>
        <Field label={t('pantry.location')}>
          <input className="input" {...form.register('location')} />
        </Field>
        <Field label={t('common.notes')}>
          <textarea className="input min-h-20" {...form.register('notes')} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
