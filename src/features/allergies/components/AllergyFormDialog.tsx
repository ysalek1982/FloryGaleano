import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useAppData } from '../../../lib/AppState'
import type { Allergy } from '../../../lib/types'
import { Button, Dialog, Field, FormSection } from '../../shared/chefUi'

const allergySchema = z.object({
  allergen_name: z.string().min(1),
  family_member_id: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe', 'anaphylaxis']),
  reaction_notes: z.string().optional(),
  avoid_traces: z.boolean(),
  cross_contact_risk: z.boolean(),
  emergency_notes: z.string().optional(),
})

export function AllergyFormDialog({
  allergy,
  onClose,
  onSubmit,
}: {
  allergy?: Allergy
  onClose: () => void
  onSubmit: (values: Partial<Allergy>) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const form = useForm<z.input<typeof allergySchema>, unknown, z.output<typeof allergySchema>>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      allergen_name: allergy?.allergen_name || '',
      family_member_id: allergy?.family_member_id || data.familyMembers[0]?.id || '',
      severity: allergy?.severity || 'moderate',
      reaction_notes: allergy?.reaction_notes || '',
      avoid_traces: allergy?.avoid_traces ?? false,
      cross_contact_risk: allergy?.cross_contact_risk ?? true,
      emergency_notes: allergy?.emergency_notes || '',
    },
  })

  return (
    <Dialog title={allergy ? t('allergies.edit') : t('allergies.create')} onClose={onClose} wide>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="allergy-form">
        <FormSection title={t('allergies.byDiner')}>
          <Field label={t('common.diner')}>
            <select className="input" {...form.register('family_member_id')}>
              {data.familyMembers.map((item) => (
                <option key={item.id} value={item.id}>{item.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label={t('common.ingredient')} error={form.formState.errors.allergen_name?.message && t('validation.required')}>
            <input className="input" {...form.register('allergen_name')} />
          </Field>
          <Field label={t('allergies.severity')}>
            <select className="input" {...form.register('severity')}>
              <option value="mild">{t('allergies.mild')}</option>
              <option value="moderate">{t('allergies.moderate')}</option>
              <option value="severe">{t('allergies.severe')}</option>
              <option value="anaphylaxis">{t('allergies.anaphylaxis')}</option>
            </select>
          </Field>
          <label className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" {...form.register('avoid_traces')} />
            {t('allergies.avoidTraces')}
          </label>
          <label className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" {...form.register('cross_contact_risk')} />
            {t('allergies.crossContactRisk')}
          </label>
        </FormSection>
        <Field label={t('allergies.reactionNotes')}>
          <textarea className="input min-h-20" {...form.register('reaction_notes')} />
        </Field>
        <Field label={t('allergies.emergencyNotes')}>
          <textarea className="input min-h-20" {...form.register('emergency_notes')} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
