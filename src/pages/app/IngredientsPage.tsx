import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import IngredientFormDialog from '../../features/ingredients/components/IngredientFormDialog'
import { useFoodCategories } from '../../features/food-categories/hooks/useFoodCategories'
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
  const foodCategories = useFoodCategories()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [allergen, setAllergen] = useState('all')
  const [source, setSource] = useState('all')
  const [missingOnly, setMissingOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const editingIngredient = data.ingredients.find((ingredient) => ingredient.id === editing)
  const ingredients = data.ingredients
    .filter((ingredient) => {
      const categoryRecord = foodCategories.findByIdOrCode(ingredient.category_id || ingredient.category)
      const searchText = [ingredient.name, ingredient.category, categoryRecord?.name_en, categoryRecord?.name_es, ...(categoryRecord?.aliases_en || []), ...(categoryRecord?.aliases_es || [])].join(' ').toLowerCase()
      return searchText.includes(query.toLowerCase())
    })
    .filter((ingredient) => {
      if (category === 'all') return true
      const categoryRecord = foodCategories.findByIdOrCode(ingredient.category_id || ingredient.category) || foodCategories.findByIdOrCode('other')
      return categoryRecord?.id === category
    })
    .filter((ingredient) => source === 'all' || ingredient.source === source)
    .filter((ingredient) => allergen === 'all' || [...ingredient.allergen_tags, ...ingredient.may_contain_tags].includes(allergen))
    .filter((ingredient) => !missingOnly || (ingredient.calories_per_100g === 0 && ingredient.protein_g_per_100g === 0))

  return (
    <>
      <PageHeader title={t('ingredients.title')} subtitle={t('ingredients.subtitle')} action={canWrite ? <Button onClick={() => setOpen(true)} data-testid="create-ingredient"><Plus className="h-4 w-4" />{t('ingredients.create')}</Button> : <ReadOnlyNotice />} />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
          <input className="input" placeholder={t('common.search')} value={query} onChange={(event) => setQuery(event.target.value)} data-testid="ingredient-search" />
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="ingredient-category-filter"><option value="all">{t('common.all')}</option>{foodCategories.categories.map((item) => <option key={item.id} value={item.id}>{foodCategories.getName(item)}</option>)}</select>
          <select className="input" value={allergen} onChange={(event) => setAllergen(event.target.value)}><option value="all">{t('ingredients.allergenTags')}</option>{Array.from(new Set(data.ingredients.flatMap((item) => [...item.allergen_tags, ...item.may_contain_tags]))).map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="input" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">{t('common.source')}</option>{['manual', 'USDA', 'AI', 'imported'].map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="flex items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold"><input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />{t('ingredients.missingNutrition')}</label>
        </div>
        <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-3" data-testid="food-category-browser">
          <h2 className="text-sm font-semibold">{t('foodCategories.browserTitle')}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {foodCategories.categories.map((item) => (
              <button
                key={item.id}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-forest-300 hover:text-forest-700 focus-ring"
                onClick={() => setCategory(item.id)}
                type="button"
              >
                {foodCategories.getName(item)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('foodCategories.futureFoodData')}</p>
        </div>
        <ResponsiveTable
          headers={[t('common.ingredient'), t('common.category'), t('ingredients.nutritionCard'), t('ingredients.allergenCard'), t('ingredients.usageCard'), t('common.actions')]}
          rows={ingredients.map((ingredient) => {
            const usage = data.recipeIngredients.filter((row) => row.ingredient_id === ingredient.id).length
            const missing = ingredient.calories_per_100g === 0 && ingredient.protein_g_per_100g === 0
            const categoryRecord = foodCategories.findByIdOrCode(ingredient.category_id || ingredient.category) || foodCategories.findByIdOrCode('other')
            return [
              <strong key="name">{ingredient.name}</strong>,
              <Badge key="category" status="ai">{categoryRecord ? foodCategories.getName(categoryRecord) : ingredient.category || '-'}</Badge>,
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
