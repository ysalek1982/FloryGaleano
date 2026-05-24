import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button, Dialog, Field, FormSection } from '../../shared/chefUi'
import { tagsToText, textToTags } from '../../shared/chefUtils'
import type { Ingredient } from '../../../lib/types'

export default function IngredientFormDialog({
  ingredient,
  onClose,
  onSubmit,
}: {
  ingredient?: Ingredient
  onClose: () => void
  onSubmit: (values: Partial<Ingredient>) => void
}) {
  const { t } = useTranslation()
  const schema = z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    default_unit: z.string().min(1),
    source: z.enum(['manual', 'USDA', 'AI', 'imported']),
    calories_per_100g: z.coerce.number().min(0),
    protein_g_per_100g: z.coerce.number().min(0),
    carbs_g_per_100g: z.coerce.number().min(0),
    fat_g_per_100g: z.coerce.number().min(0),
    fiber_g_per_100g: z.coerce.number().min(0),
    sugar_g_per_100g: z.coerce.number().min(0),
    sodium_mg_per_100g: z.coerce.number().min(0),
    calcium_mg_per_100g: z.coerce.number().min(0),
    iron_mg_per_100g: z.coerce.number().min(0),
    allergen_tags: z.string().optional(),
    may_contain_tags: z.string().optional(),
    allowed_exceptions: z.string().optional(),
    blocked_derivatives: z.string().optional(),
    cost_per_unit: z.coerce.number().min(0),
    package_size: z.coerce.number().min(0),
    package_unit: z.string().optional(),
    notes: z.string().optional(),
  })
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: ingredient?.name || '',
      category: ingredient?.category || '',
      default_unit: ingredient?.default_unit || 'g',
      source: ingredient?.source || 'manual',
      calories_per_100g: ingredient?.calories_per_100g ?? 0,
      protein_g_per_100g: ingredient?.protein_g_per_100g ?? 0,
      carbs_g_per_100g: ingredient?.carbs_g_per_100g ?? 0,
      fat_g_per_100g: ingredient?.fat_g_per_100g ?? 0,
      fiber_g_per_100g: ingredient?.fiber_g_per_100g ?? 0,
      sugar_g_per_100g: ingredient?.sugar_g_per_100g ?? 0,
      sodium_mg_per_100g: ingredient?.sodium_mg_per_100g ?? 0,
      calcium_mg_per_100g: ingredient?.calcium_mg_per_100g ?? 0,
      iron_mg_per_100g: ingredient?.iron_mg_per_100g ?? 0,
      allergen_tags: tagsToText(ingredient?.allergen_tags),
      may_contain_tags: tagsToText(ingredient?.may_contain_tags),
      allowed_exceptions: tagsToText(ingredient?.allowed_exceptions),
      blocked_derivatives: tagsToText(ingredient?.blocked_derivatives),
      cost_per_unit: ingredient?.cost_per_unit ?? 0,
      package_size: ingredient?.package_size ?? 0,
      package_unit: ingredient?.package_unit || 'g',
      notes: ingredient?.notes || '',
    },
  })
  return (
    <Dialog title={ingredient ? t('ingredients.edit') : t('ingredients.create')} onClose={onClose} wide>
      <form className="grid gap-5" data-testid="ingredient-form" onSubmit={form.handleSubmit((values) => onSubmit({ ...values, allergen_tags: textToTags(values.allergen_tags), may_contain_tags: textToTags(values.may_contain_tags), allowed_exceptions: textToTags(values.allowed_exceptions), blocked_derivatives: textToTags(values.blocked_derivatives) }))}>
        <FormSection title={t('recipes.basicInfo')}>
          <Field label={t('recipes.name')} error={form.formState.errors.name?.message && t('validation.required')}><input className="input" {...form.register('name')} /></Field>
          <Field label={t('common.category')}><input className="input" {...form.register('category')} /></Field>
          <Field label={t('ingredients.defaultUnit')}><input className="input" {...form.register('default_unit')} /></Field>
          <Field label={t('common.source')}><select className="input" {...form.register('source')}>{['manual', 'USDA', 'AI', 'imported'].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        </FormSection>
        <FormSection title={t('ingredients.nutritionCard')}>
          {(['calories_per_100g', 'protein_g_per_100g', 'carbs_g_per_100g', 'fat_g_per_100g', 'fiber_g_per_100g', 'sugar_g_per_100g', 'sodium_mg_per_100g', 'calcium_mg_per_100g', 'iron_mg_per_100g'] as const).map((key) => (
            <Field key={key} label={t(`ingredientFields.${key}`)} error={form.formState.errors[key]?.message && t('validation.positive')}><input className="input" type="number" step="0.1" {...form.register(key)} /></Field>
          ))}
        </FormSection>
        <FormSection title={t('ingredients.allergenCard')}>
          <Field label={t('ingredients.allergenTags')}><input className="input" {...form.register('allergen_tags')} /></Field>
          <Field label={t('ingredients.mayContainTags')}><input className="input" {...form.register('may_contain_tags')} /></Field>
          <Field label={t('ingredients.allowedExceptions')}><input className="input" {...form.register('allowed_exceptions')} /></Field>
          <Field label={t('ingredients.blockedDerivatives')}><input className="input" {...form.register('blocked_derivatives')} /></Field>
        </FormSection>
        <FormSection title={t('ingredients.costCard')}>
          <Field label={t('common.cost')}><input className="input" type="number" step="0.01" {...form.register('cost_per_unit')} /></Field>
          <Field label={t('ingredients.packageSize')}><input className="input" type="number" step="0.1" {...form.register('package_size')} /></Field>
          <Field label={t('ingredients.packageUnit')}><input className="input" {...form.register('package_unit')} /></Field>
          <Button type="button" disabled variant="secondary">{t('ingredients.searchNutritionDb')} - {t('common.future')}</Button>
        </FormSection>
        <Field label={t('common.notes')}><textarea className="input min-h-20" {...form.register('notes')} /></Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
