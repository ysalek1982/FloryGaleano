import { Plus, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import RecipeBuilderDialog from '../../features/recipes/components/RecipeBuilderDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Info,
  PageHeader,
  ReadOnlyNotice,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { getRecipeSafetyStatus } from '../../features/shared/chefUtils'
import { useAppData } from '../../lib/AppState'
import { addDays, currency, formatNumber, todayIso } from '../../lib/utils'
import { calculateRecipeNutrition } from '../../services/nutritionEngine'
import { validateRecipeRotation } from '../../services/menuRotationEngine'

export default function RecipesPage() {
  const { t } = useTranslation()
  const { data, addRecipe, updateRecipe, setData } = useAppData()
  const canWrite = useCanWrite()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [safetyFilter, setSafetyFilter] = useState('all')
  const categories = Array.from(new Set(data.recipes.map((recipe) => recipe.category || '').filter(Boolean)))
  const editingRecipe = data.recipes.find((recipe) => recipe.id === editing)
  const recipes = data.recipes
    .filter((recipe) => recipe.status !== 'archived')
    .filter((recipe) => recipe.name.toLowerCase().includes(query.toLowerCase()))
    .filter((recipe) => category === 'all' || recipe.category === category)
    .filter((recipe) => {
      if (safetyFilter === 'all') return true
      return getRecipeSafetyStatus(recipe, data) === safetyFilter
    })

  return (
    <>
      <PageHeader
        title={t('recipes.title')}
        subtitle={t('recipes.subtitle')}
        action={(
          <div className="flex gap-2">
            <Link to="/app/ai-chef" className="inline-flex rounded-md bg-ai-600 px-4 py-2 text-sm font-semibold text-white focus-ring"><WandSparkles className="h-4 w-4" />{t('recipes.generateAi')}</Link>
            {canWrite ? <Button onClick={() => setOpen(true)} data-testid="create-recipe"><Plus className="h-4 w-4" />{t('recipes.create')}</Button> : <ReadOnlyNotice />}
          </div>
        )}
      />
      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input className="input" placeholder={t('common.search')} value={query} onChange={(event) => setQuery(event.target.value)} data-testid="recipe-search" />
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t('common.all')}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="input" value={safetyFilter} onChange={(event) => setSafetyFilter(event.target.value)}><option value="all">{t('common.status')}</option><option value="safe">{t('common.safe')}</option><option value="review_needed">{t('common.reviewNeeded')}</option><option value="blocked">{t('common.blocked')}</option></select>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {recipes.map((recipe) => {
            const nutrition = calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients)
            const status = getRecipeSafetyStatus(recipe, data)
            const rotation = validateRecipeRotation(recipe, todayIso(), data.menuPlanItems, data.settings.default_variety_days)
            const cost = data.recipeIngredients.filter((row) => row.recipe_id === recipe.id).reduce((sum, row) => sum + ((data.ingredients.find((ingredient) => ingredient.id === row.ingredient_id)?.cost_per_unit ?? 0) * row.quantity_g), 0)
            return (
              <Card key={recipe.id} className="shadow-none">
                <div className="mb-4 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.name} className="h-44 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-sm font-semibold text-slate-500">{t('recipes.noImage')}</div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">{recipe.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{recipe.description}</p>
                  </div>
                  <Badge status={status}>{t(status === 'review_needed' ? 'common.reviewNeeded' : `common.${status}`)}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{recipe.category}</Badge>
                  <Badge>{recipe.main_protein}</Badge>
                  {recipe.ai_generated && <Badge status="ai">{t('nav.aiChef')}</Badge>}
                  {recipe.is_freezer_friendly && <Badge status="safe">{t('recipes.freezerFriendly')}</Badge>}
                  {recipe.is_school_friendly && <Badge status="safe">{t('recipes.schoolFriendly')}</Badge>}
                  {nutrition.missing_nutrition && <Badge status="warning">{t('recipes.missingData')}</Badge>}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label={t('common.calories')} value={formatNumber(nutrition.calories_per_serving)} />
                  <Info label={t('common.protein')} value={`${formatNumber(nutrition.protein_g_per_serving)}g`} />
                  <Info label={t('recipes.costEstimate')} value={currency(cost)} />
                  <Info label={t('recipes.nextAllowedDate')} value={rotation.waitMoreDays ? addDays(todayIso(), rotation.waitMoreDays) : todayIso()} />
                </dl>
                {canWrite && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setEditing(recipe.id)}>{t('common.edit')}</Button>
                    <Button variant="secondary" onClick={() => addRecipe({ ...recipe, id: undefined, name: `${recipe.name} ${t('common.copy')}`, status: 'draft' }, data.recipeIngredients.filter((item) => item.recipe_id === recipe.id))}>{t('common.duplicate')}</Button>
                    <Button variant="ghost" onClick={() => setData((current) => ({ ...current, recipes: current.recipes.map((item) => item.id === recipe.id ? { ...item, status: 'archived', updated_at: new Date().toISOString() } : item) }))}>{t('common.archive')}</Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
        {recipes.length === 0 && <EmptyState text={t('empty.recipes')} />}
      </Card>
      {canWrite && open && <RecipeBuilderDialog onClose={() => setOpen(false)} onSubmit={(recipe, rows) => { addRecipe(recipe, rows); setOpen(false) }} />}
      {canWrite && editingRecipe && <RecipeBuilderDialog recipe={editingRecipe} onClose={() => setEditing(null)} onSubmit={(recipe, rows) => { updateRecipe(editingRecipe.id, recipe, rows); setEditing(null) }} />}
    </>
  )
}
