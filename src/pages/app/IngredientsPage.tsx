import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import IngredientFormDialog from '../../features/ingredients/components/IngredientFormDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ReadOnlyNotice,
  ResponsiveTable,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'

export default function IngredientsPage() {
  const { t } = useTranslation()
  const { data, addIngredient, updateIngredient } = useAppData()
  const canWrite = useCanWrite()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [allergen, setAllergen] = useState('all')
  const [source, setSource] = useState('all')
  const [missingOnly, setMissingOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const categories = Array.from(new Set(data.ingredients.map((ingredient) => ingredient.category || '').filter(Boolean)))
  const editingIngredient = data.ingredients.find((ingredient) => ingredient.id === editing)
  const ingredients = data.ingredients
    .filter((ingredient) => ingredient.name.toLowerCase().includes(query.toLowerCase()))
    .filter((ingredient) => category === 'all' || ingredient.category === category)
    .filter((ingredient) => source === 'all' || ingredient.source === source)
    .filter((ingredient) => allergen === 'all' || [...ingredient.allergen_tags, ...ingredient.may_contain_tags].includes(allergen))
    .filter((ingredient) => !missingOnly || (ingredient.calories_per_100g === 0 && ingredient.protein_g_per_100g === 0))

  return (
    <>
      <PageHeader title={t('ingredients.title')} subtitle={t('ingredients.subtitle')} action={canWrite ? <Button onClick={() => setOpen(true)} data-testid="create-ingredient"><Plus className="h-4 w-4" />{t('ingredients.create')}</Button> : <ReadOnlyNotice />} />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
          <input className="input" placeholder={t('common.search')} value={query} onChange={(event) => setQuery(event.target.value)} data-testid="ingredient-search" />
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t('common.all')}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="input" value={allergen} onChange={(event) => setAllergen(event.target.value)}><option value="all">{t('ingredients.allergenTags')}</option>{Array.from(new Set(data.ingredients.flatMap((item) => [...item.allergen_tags, ...item.may_contain_tags]))).map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="input" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">{t('common.source')}</option>{['manual', 'USDA', 'AI', 'imported'].map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="flex items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold"><input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />{t('ingredients.missingNutrition')}</label>
        </div>
        <ResponsiveTable
          headers={[t('common.ingredient'), t('common.category'), t('ingredients.nutritionCard'), t('ingredients.allergenCard'), t('ingredients.usageCard'), t('common.actions')]}
          rows={ingredients.map((ingredient) => {
            const usage = data.recipeIngredients.filter((row) => row.ingredient_id === ingredient.id).length
            const missing = ingredient.calories_per_100g === 0 && ingredient.protein_g_per_100g === 0
            return [
              <strong key="name">{ingredient.name}</strong>,
              ingredient.category || '-',
              <Badge key="nutrition" status={missing ? 'warning' : 'safe'}>{ingredient.calories_per_100g} {t('common.calories')} / {ingredient.protein_g_per_100g}g {t('common.protein')}</Badge>,
              [...ingredient.allergen_tags, ...ingredient.may_contain_tags].join(', ') || t('common.safe'),
              usage,
              canWrite ? <Button key="edit" variant="secondary" onClick={() => setEditing(ingredient.id)}>{t('common.edit')}</Button> : <ReadOnlyNotice key="readonly" />,
            ]
          })}
        />
        {ingredients.length === 0 && <EmptyState text={t('empty.ingredients')} />}
      </Card>
      {canWrite && open && <IngredientFormDialog onClose={() => setOpen(false)} onSubmit={(values) => { addIngredient(values); setOpen(false) }} />}
      {canWrite && editingIngredient && <IngredientFormDialog ingredient={editingIngredient} onClose={() => setEditing(null)} onSubmit={(values) => { updateIngredient(editingIngredient.id, values); setEditing(null) }} />}
    </>
  )
}
