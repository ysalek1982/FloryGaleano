import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import {
  Button,
  Dialog,
  Field,
  FormSection,
  NutritionCard,
  SafetyMatrix,
} from '../../../features/shared/chefUi'
import { useAppData } from '../../../lib/AppState'
import type { Recipe, RecipeIngredient } from '../../../lib/types'
import { cn } from '../../../lib/utils'
import { validateRecipeForFamily } from '../../../services/allergyShield'
import { calculateRecipeNutrition } from '../../../services/nutritionEngine'

export default function RecipeBuilderDialog({
  recipe,
  onClose,
  onSubmit,
}: {
  recipe?: Recipe
  onClose: () => void
  onSubmit: (recipe: Partial<Recipe>, rows: Array<Partial<RecipeIngredient>>) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<Array<Partial<RecipeIngredient>>>(() => {
    const existingRows = data.recipeIngredients.filter((row) => row.recipe_id === recipe?.id).map((row) => ({ ...row }))
    return existingRows.length ? existingRows : [{ ingredient_id: data.ingredients[0]?.id, quantity_g: 100, is_optional: false }]
  })
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    cuisine_type: z.string().optional(),
    main_protein: z.string().optional(),
    meal_style: z.string().optional(),
    prep_time_minutes: z.coerce.number().min(0),
    cook_time_minutes: z.coerce.number().min(0),
    servings: z.coerce.number().positive(),
    serving_size_g: z.coerce.number().min(0),
    instructions: z.string().optional(),
    chef_notes: z.string().optional(),
    reheating_instructions: z.string().optional(),
    image_url: z.string().url().or(z.literal('')).optional(),
    status: z.enum(['draft', 'active', 'archived']),
    is_freezer_friendly: z.boolean(),
    is_school_friendly: z.boolean(),
    is_gluten_free: z.boolean(),
    visible_melted_cheese: z.boolean(),
  })
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: recipe?.name || '',
      description: recipe?.description || '',
      category: recipe?.category || '',
      cuisine_type: recipe?.cuisine_type || '',
      main_protein: recipe?.main_protein || '',
      meal_style: recipe?.meal_style || '',
      prep_time_minutes: recipe?.prep_time_minutes ?? 0,
      cook_time_minutes: recipe?.cook_time_minutes ?? 0,
      servings: recipe?.servings ?? 4,
      serving_size_g: recipe?.serving_size_g ?? 250,
      instructions: recipe?.instructions || '',
      chef_notes: recipe?.chef_notes || '',
      reheating_instructions: recipe?.reheating_instructions || '',
      image_url: recipe?.image_url || '',
      status: recipe?.status || 'draft',
      is_freezer_friendly: recipe?.is_freezer_friendly ?? false,
      is_school_friendly: recipe?.is_school_friendly ?? false,
      is_gluten_free: recipe?.is_gluten_free ?? false,
      visible_melted_cheese: recipe?.visible_melted_cheese ?? false,
    },
  })
  const values = useWatch({ control: form.control })
  const previewRecipe: Recipe = {
    id: recipe?.id || 'preview',
    owner_id: recipe?.owner_id || 'preview',
    family_id: recipe?.family_id || data.families[0]?.id,
    scope: recipe?.scope || 'family',
    name: values.name || t('recipes.create'),
    description: values.description || '',
    category: values.category || '',
    cuisine_type: values.cuisine_type || '',
    main_protein: values.main_protein || '',
    meal_style: values.meal_style || '',
    prep_time_minutes: Number(values.prep_time_minutes || 0),
    cook_time_minutes: Number(values.cook_time_minutes || 0),
    servings: Number(values.servings || 1),
    serving_size_g: Number(values.serving_size_g || 0),
    instructions: values.instructions || '',
    chef_notes: values.chef_notes || '',
    reheating_instructions: values.reheating_instructions || '',
    image_url: values.image_url || '',
    is_freezer_friendly: Boolean(values.is_freezer_friendly),
    is_school_friendly: Boolean(values.is_school_friendly),
    is_gluten_free: Boolean(values.is_gluten_free),
    visible_melted_cheese: Boolean(values.visible_melted_cheese),
    status: values.status || 'draft',
    created_at: recipe?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const previewRows = rows.map((row, index) => ({
    id: row.id || `preview-${index}`,
    recipe_id: previewRecipe.id,
    ingredient_id: row.ingredient_id || data.ingredients[0]?.id || '',
    quantity_g: Number(row.quantity_g || 0),
    is_optional: row.is_optional ?? false,
    preparation_note: row.preparation_note || '',
    created_at: row.created_at || new Date().toISOString(),
  }))
  const nutrition = calculateRecipeNutrition(previewRecipe, previewRows, data.ingredients)
  const safety = validateRecipeForFamily(previewRecipe, data.familyMembers, data.allergies, previewRows, data.ingredients)
  const steps = ['recipes.basicInfo', 'recipes.ingredients', 'recipes.instructions', 'recipes.nutrition', 'recipes.safety', 'recipes.usage']

  const submit = form.handleSubmit((formValues) => {
    if (rows.length === 0 || rows.some((row) => !row.ingredient_id)) return setError(t('recipes.requiresIngredients'))
    if (rows.some((row) => Number(row.quantity_g || 0) <= 0)) return setError(t('recipes.requiresPositiveQuantity'))
    if (formValues.status === 'active' && rows.length === 0) return setError(t('recipes.requiresIngredients'))
    onSubmit(formValues, rows)
  })

  return (
    <Dialog title={recipe ? t('recipes.edit') : t('recipes.create')} onClose={onClose} wide>
      <div data-testid="recipe-builder">
        <div className="mb-5 flex flex-wrap gap-2">
          {steps.map((key, index) => (
            <button key={key} type="button" onClick={() => setStep(index)} className={cn('rounded-md px-3 py-2 text-sm font-semibold focus-ring', step === index ? 'bg-forest-700 text-white' : 'bg-stone-100 text-slate-700')}>
              {t(key)}
            </button>
          ))}
        </div>
        <form className="grid gap-4" onSubmit={submit} data-testid="recipe-form">
          {step === 0 && (
            <FormSection title={t('recipes.basicInfo')}>
              <Field label={t('recipes.name')} error={form.formState.errors.name?.message && t('validation.required')}><input className="input" {...form.register('name')} /></Field>
              <Field label={t('recipes.description')}><input className="input" {...form.register('description')} /></Field>
              <Field label={t('common.category')}><input className="input" {...form.register('category')} /></Field>
              <Field label={t('recipes.cuisine')}><input className="input" {...form.register('cuisine_type')} /></Field>
              <Field label={t('recipes.mainProtein')}><input className="input" {...form.register('main_protein')} /></Field>
              <Field label={t('recipes.mealStyle')}><input className="input" {...form.register('meal_style')} /></Field>
              <Field label={t('recipes.prepTime')}><input className="input" type="number" {...form.register('prep_time_minutes')} /></Field>
              <Field label={t('recipes.cookTime')}><input className="input" type="number" {...form.register('cook_time_minutes')} /></Field>
              <Field label={t('recipes.servings')}><input className="input" type="number" {...form.register('servings')} /></Field>
              <Field label={t('portion.plannedGrams')}><input className="input" type="number" {...form.register('serving_size_g')} /></Field>
              <Field label={t('recipes.imageUrl')} error={form.formState.errors.image_url?.message && t('validation.invalidUrl')}>
                <input className="input" type="url" placeholder="https://example.com/recipe.jpg" {...form.register('image_url')} data-testid="recipe-image-url" />
              </Field>
              {values.image_url && (
                <div className="overflow-hidden rounded-md border border-stone-200">
                  <img src={values.image_url} alt={t('recipes.imagePreview')} className="h-44 w-full object-cover" />
                </div>
              )}
            </FormSection>
          )}
          {step === 1 && (
            <div className="grid gap-3">
              {rows.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-md border border-stone-200 p-3 md:grid-cols-[1fr_150px_auto]">
                  <Field label={t('common.ingredient')}>
                    <select className="input" value={row.ingredient_id || ''} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ingredient_id: event.target.value } : item))}>
                      {data.ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
                    </select>
                  </Field>
                  <Field label={t('recipes.quantityGrams')}>
                    <input className="input" type="number" value={row.quantity_g ?? 0} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity_g: Number(event.target.value) } : item))} />
                  </Field>
                  <Button type="button" variant="ghost" onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t('common.remove')}</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setRows((current) => [...current, { ingredient_id: data.ingredients[0]?.id, quantity_g: 100, is_optional: false }])}>{t('common.addRow')}</Button>
            </div>
          )}
          {step === 2 && (
            <FormSection title={t('recipes.instructions')}>
              <Field label={t('recipes.instructions')}><textarea className="input min-h-32" {...form.register('instructions')} /></Field>
              <Field label={t('recipes.chefNotes')}><textarea className="input min-h-24" {...form.register('chef_notes')} /></Field>
              <Field label={t('recipes.reheating')}><textarea className="input min-h-24" {...form.register('reheating_instructions')} /></Field>
            </FormSection>
          )}
          {step === 3 && <NutritionCard nutrition={nutrition} />}
          {step === 4 && <SafetyMatrix safety={safety} />}
          {step === 5 && (
            <FormSection title={t('recipes.usage')}>
              <Field label={t('common.status')}>
                <select className="input" {...form.register('status')}>
                  <option value="draft">{t('common.draft')}</option>
                  <option value="active">{t('common.active')}</option>
                  <option value="archived">{t('common.archive')}</option>
                </select>
              </Field>
              {(['is_freezer_friendly', 'is_school_friendly', 'is_gluten_free', 'visible_melted_cheese'] as const).map((key) => (
                <label key={key} className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" {...form.register(key)} />
                  {t(key === 'is_freezer_friendly' ? 'recipes.freezerFriendly' : key === 'is_school_friendly' ? 'recipes.schoolFriendly' : key === 'is_gluten_free' ? 'recipes.glutenFree' : 'recipes.visibleMeltedCheese')}
                </label>
              ))}
            </FormSection>
          )}
          {error && <p className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(Math.max(0, step - 1))}>{t('common.back')}</Button>
            {step < steps.length - 1 && <Button type="button" onClick={() => setStep(step + 1)}>{t('common.next')}</Button>}
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
