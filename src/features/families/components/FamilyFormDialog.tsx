import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button, Dialog, Field } from '../../shared/chefUi'
import type { Family } from '../../../lib/types'

type FamilyFormValues = z.infer<typeof familySchema>

const familySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().optional(),
  primary_contact_phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export function FamilyFormDialog({
  family,
  onClose,
  onSubmit,
}: {
  family?: Family
  onClose: () => void
  onSubmit: (values: Partial<Family>) => void
}) {
  const { t } = useTranslation()
  const form = useForm<FamilyFormValues>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: family?.name || '',
      description: family?.description || '',
      primary_contact_name: family?.primary_contact_name || '',
      primary_contact_email: family?.primary_contact_email || '',
      primary_contact_phone: family?.primary_contact_phone || '',
      address: family?.address || '',
      notes: family?.notes || '',
    },
  })

  return (
    <Dialog title={family ? t('families.edit') : t('families.create')} onClose={onClose}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="family-form">
        <Field label={t('recipes.name')} error={form.formState.errors.name?.message && t('validation.required')}>
          <input className="input" {...form.register('name')} />
        </Field>
        <Field label={t('recipes.description')}>
          <textarea className="input min-h-20" {...form.register('description')} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t('families.primaryContact')}>
            <input className="input" {...form.register('primary_contact_name')} />
          </Field>
          <Field label={t('families.contactEmail')}>
            <input className="input" type="email" {...form.register('primary_contact_email')} />
          </Field>
          <Field label={t('families.contactPhone')}>
            <input className="input" {...form.register('primary_contact_phone')} />
          </Field>
          <Field label={t('families.address')}>
            <input className="input" {...form.register('address')} />
          </Field>
        </div>
        <Field label={t('common.notes')}>
          <textarea className="input min-h-20" {...form.register('notes')} />
        </Field>
        <Button type="submit" data-testid="save-family">
          {t('common.save')}
        </Button>
      </form>
    </Dialog>
  )
}
