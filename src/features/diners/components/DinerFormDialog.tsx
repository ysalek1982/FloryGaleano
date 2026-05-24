import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useAppData } from '../../../lib/AppState'
import type { FamilyMember } from '../../../lib/types'
import { Button, Dialog, Field, FormSection } from '../../shared/chefUi'

export type DinerExtras = {
  allergy_name?: string
  allergy_severity: 'mild' | 'moderate' | 'severe' | 'anaphylaxis'
  avoid_traces: boolean
  restriction_type?: string
  restriction_description?: string
  restriction_medical: boolean
  preference_type: 'likes' | 'dislikes' | 'avoid' | 'favorite'
  preference_item?: string
  preference_notes?: string
}

const dinerSchema = z.object({
  family_id: z.string().min(1),
  full_name: z.string().min(1),
  nickname: z.string().optional(),
  age_years: z.coerce.number().min(0),
  activity_level: z.enum(['low', 'moderate', 'high', 'athlete']),
  portion_factor: z.coerce.number().positive(),
  daily_calorie_target: z.coerce.number().min(0),
  daily_protein_target_g: z.coerce.number().min(0),
  notes: z.string().optional(),
  allergy_name: z.string().optional(),
  allergy_severity: z.enum(['mild', 'moderate', 'severe', 'anaphylaxis']),
  avoid_traces: z.boolean(),
  restriction_type: z.string().optional(),
  restriction_description: z.string().optional(),
  restriction_medical: z.boolean(),
  preference_type: z.enum(['likes', 'dislikes', 'avoid', 'favorite']),
  preference_item: z.string().optional(),
  preference_notes: z.string().optional(),
})

export function DinerFormDialog({
  diner,
  onClose,
  onSubmit,
}: {
  diner?: FamilyMember
  onClose: () => void
  onSubmit: (values: Partial<FamilyMember>, extras: DinerExtras) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const form = useForm<z.input<typeof dinerSchema>, unknown, z.output<typeof dinerSchema>>({
    resolver: zodResolver(dinerSchema),
    defaultValues: {
      family_id: diner?.family_id || data.families[0]?.id || '',
      full_name: diner?.full_name || '',
      nickname: diner?.nickname || '',
      age_years: diner?.age_years ?? 0,
      activity_level: diner?.activity_level || 'moderate',
      portion_factor: diner?.portion_factor ?? 1,
      daily_calorie_target: diner?.daily_calorie_target ?? 1800,
      daily_protein_target_g: diner?.daily_protein_target_g ?? 60,
      notes: diner?.notes || '',
      allergy_name: '',
      allergy_severity: 'moderate',
      avoid_traces: false,
      restriction_type: '',
      restriction_description: '',
      restriction_medical: false,
      preference_type: 'likes',
      preference_item: '',
      preference_notes: '',
    },
  })

  return (
    <Dialog title={diner ? t('diners.edit') : t('diners.create')} onClose={onClose} wide>
      <form
        className="grid gap-5"
        data-testid="diner-form"
        onSubmit={form.handleSubmit((values) => {
          const {
            allergy_name,
            allergy_severity,
            avoid_traces,
            restriction_type,
            restriction_description,
            restriction_medical,
            preference_type,
            preference_item,
            preference_notes,
            ...dinerValues
          } = values
          onSubmit(dinerValues, {
            allergy_name,
            allergy_severity,
            avoid_traces,
            restriction_type,
            restriction_description,
            restriction_medical,
            preference_type,
            preference_item,
            preference_notes,
          })
        })}
      >
        <FormSection title={t('diners.basicInfo')}>
          <Field label={t('common.family')}>
            <select className="input" {...form.register('family_id')}>
              {data.families.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t('diners.fullName')} error={form.formState.errors.full_name?.message && t('validation.required')}>
            <input className="input" {...form.register('full_name')} />
          </Field>
          <Field label={t('diners.nickname')}>
            <input className="input" {...form.register('nickname')} />
          </Field>
          <Field label={t('diners.age')}>
            <input className="input" type="number" {...form.register('age_years')} />
          </Field>
        </FormSection>
        <FormSection title={t('diners.nutritionTargets')}>
          <Field label={t('diners.activityLevel')}>
            <select className="input" {...form.register('activity_level')}>
              <option value="low">{t('diners.low')}</option>
              <option value="moderate">{t('diners.moderate')}</option>
              <option value="high">{t('diners.high')}</option>
              <option value="athlete">{t('diners.athlete')}</option>
            </select>
          </Field>
          <Field label={t('diners.portionFactor')}>
            <input className="input" type="number" step="0.1" {...form.register('portion_factor')} />
          </Field>
          <Field label={t('diners.calorieTarget')}>
            <input className="input" type="number" {...form.register('daily_calorie_target')} />
          </Field>
          <Field label={t('diners.proteinTarget')}>
            <input className="input" type="number" {...form.register('daily_protein_target_g')} />
          </Field>
        </FormSection>
        <FormSection title={t('diners.allergies')}>
          <Field label={t('common.ingredient')}>
            <input className="input" {...form.register('allergy_name')} />
          </Field>
          <Field label={t('allergies.severity')}>
            <select className="input" {...form.register('allergy_severity')}>
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
        </FormSection>
        <FormSection title={t('diners.restrictions')}>
          <Field label={t('diners.restrictionType')}>
            <input className="input" {...form.register('restriction_type')} />
          </Field>
          <Field label={t('recipes.description')}>
            <input className="input" {...form.register('restriction_description')} />
          </Field>
          <label className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" {...form.register('restriction_medical')} />
            {t('diners.medical')}
          </label>
        </FormSection>
        <FormSection title={t('diners.preferences')}>
          <Field label={t('diners.preferenceType')}>
            <select className="input" {...form.register('preference_type')}>
              <option value="likes">{t('diners.likes')}</option>
              <option value="dislikes">{t('diners.dislikes')}</option>
              <option value="avoid">{t('diners.avoid')}</option>
              <option value="favorite">{t('diners.favorite')}</option>
            </select>
          </Field>
          <Field label={t('diners.preferenceItem')}>
            <input className="input" {...form.register('preference_item')} />
          </Field>
          <Field label={t('common.notes')}>
            <input className="input" {...form.register('preference_notes')} />
          </Field>
        </FormSection>
        <Field label={t('common.notes')}>
          <textarea className="input min-h-24" {...form.register('notes')} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
