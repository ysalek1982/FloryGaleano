import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useAppData } from '../../../lib/AppState'
import type { ShoppingListItem } from '../../../lib/types'
import { Button, Dialog, Field } from '../../shared/chefUi'

const manualItemSchema = z.object({
  shopping_list_id: z.string().min(1),
  ingredient_id: z.string().min(1),
  required_quantity: z.coerce.number().min(0),
  available_quantity: z.coerce.number().min(0),
  unit: z.string().min(1),
  notes: z.string().optional(),
})

export function ManualShoppingItemDialog({
  item,
  onClose,
  onSubmit,
}: {
  item?: ShoppingListItem
  onClose: () => void
  onSubmit: (values: Partial<ShoppingListItem>) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const form = useForm<z.input<typeof manualItemSchema>, unknown, z.output<typeof manualItemSchema>>({
    resolver: zodResolver(manualItemSchema),
    defaultValues: {
      shopping_list_id: item?.shopping_list_id || data.shoppingLists[0]?.id || '',
      ingredient_id: item?.ingredient_id || data.ingredients[0]?.id || '',
      required_quantity: item?.required_quantity ?? 0,
      available_quantity: item?.available_quantity ?? 0,
      unit: item?.unit || 'g',
      notes: item?.notes || '',
    },
  })

  return (
    <Dialog title={item ? t('common.edit') : t('shopping.manualItem')} onClose={onClose}>
      <form
        className="grid gap-4"
        data-testid="shopping-item-form"
        onSubmit={form.handleSubmit((values) =>
          onSubmit({ ...values, missing_quantity: Math.max(0, values.required_quantity - values.available_quantity), is_checked: item?.is_checked ?? false }),
        )}
      >
        <Field label={t('nav.shoppingList')}>
          <select className="input" {...form.register('shopping_list_id')}>
            {data.shoppingLists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
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
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t('common.required')}>
            <input className="input" type="number" {...form.register('required_quantity')} />
          </Field>
          <Field label={t('common.available')}>
            <input className="input" type="number" {...form.register('available_quantity')} />
          </Field>
          <Field label={t('common.unit')}>
            <input className="input" {...form.register('unit')} />
          </Field>
        </div>
        <Field label={t('common.notes')}>
          <input className="input" {...form.register('notes')} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
