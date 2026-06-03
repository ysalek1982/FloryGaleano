import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import RecipeBuilderDialog from '../../features/recipes/components/RecipeBuilderDialog'
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
          <div className="flex flex-wrap gap-2">
            <AiCopilotButton
              compact
              context={{ page_id: 'recipes', selected_family_id: data.families[0]?.id, relevant_records: { visible_recipes: recipes.length } }}
              actionKey="recipes.improveRecipe"
              labelKey="aiCopilot.actions.recipes.improveRecipe.label"
              testId="recipes-ai-improve"
            />
            <AiCopilotButton
              compact
              context={{ page_id: 'recipes', selected_family_id: data.families[0]?.id, relevant_records: { visible_recipes: recipes.length } }}
              actionKey="recipes.checkSafety"
              labelKey="aiCopilot.actions.recipes.checkSafety.label"
              testId="recipes-ai-safety"
            />
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
        <ResponsiveTable
          caption={t('recipes.title')}
          compact
          headers={[
            t('common.recipe'),
            t('common.category'),
            t('recipes.mainProtein'),
            t('common.status'),
            t('recipes.servings'),
            t('recipes.nutritionCard'),
            t('recipes.costEstimate'),
            t('recipes.nextAllowedDate'),
            t('common.actions'),
          ]}
          rows={recipes.map((recipe) => {
            const nutrition = calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients)
            const status = getRecipeSafetyStatus(recipe, data)
            const rotation = validateRecipeRotation(recipe, todayIso(), data.menuPlanItems, data.settings.default_variety_days)
            const cost = data.recipeIngredients.filter((row) => row.recipe_id === recipe.id).reduce((sum, row) => sum + ((data.ingredients.find((ingredient) => ingredient.id === row.ingredient_id)?.cost_per_unit ?? 0) * row.quantity_g), 0)
            const nextAllowedDate = rotation.waitMoreDays ? addDays(todayIso(), rotation.waitMoreDays) : todayIso()
            return [
              <section key="recipe" className="flex min-w-72 items-center gap-3" aria-label={`${recipe.name} ${t('common.recipe')}`}>
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold text-slate-500">{t('recipes.noImage')}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{recipe.name}</p>
                  <p className="line-clamp-2 max-w-md text-xs text-slate-500">{recipe.description || '-'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {canWrite ? <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setEditing(recipe.id)}>{t('common.edit')}</Button> : <ReadOnlyNotice />}
                    {recipe.ai_generated && <Badge status="ai">{t('nav.aiChef')}</Badge>}
                    {nutrition.missing_nutrition && <Badge status="warning">{t('recipes.missingData')}</Badge>}
                  </div>
                </div>
              </section>,
              <Badge key="category">{recipe.category || '-'}</Badge>,
              recipe.main_protein || '-',
              <Badge key="status" status={status}>{t(status === 'review_needed' ? 'common.reviewNeeded' : `common.${status}`)}</Badge>,
              formatNumber(recipe.servings),
              <div key="nutrition" className="whitespace-nowrap text-sm">
                <p>{formatNumber(nutrition.calories_per_serving)} {t('common.calories')}</p>
                <p className="text-xs text-slate-500">{formatNumber(nutrition.protein_g_per_serving)}g {t('common.protein')}</p>
              </div>,
              currency(cost),
              <Badge key="rotation" status={rotation.status === 'allowed' ? 'safe' : 'warning'}>{nextAllowedDate}</Badge>,
              canWrite ? (
                <div key="actions" className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => addRecipe({ ...recipe, id: undefined, name: `${recipe.name} ${t('common.copy')}`, status: 'draft' }, data.recipeIngredients.filter((item) => item.recipe_id === recipe.id))}>{t('common.duplicate')}</Button>
                  <Button variant="ghost" onClick={() => setData((current) => ({ ...current, recipes: current.recipes.map((item) => item.id === recipe.id ? { ...item, status: 'archived', updated_at: new Date().toISOString() } : item) }))}>{t('common.archive')}</Button>
                </div>
              ) : <ReadOnlyNotice key="readonly" />,
            ]
          })}
        />
        {recipes.length === 0 && <EmptyState text={t('empty.recipes')} />}
      </Card>
      {canWrite && open && <RecipeBuilderDialog onClose={() => setOpen(false)} onSubmit={(recipe, rows) => { addRecipe(recipe, rows); setOpen(false) }} />}
      {canWrite && editingRecipe && <RecipeBuilderDialog recipe={editingRecipe} onClose={() => setEditing(null)} onSubmit={(recipe, rows) => { updateRecipe(editingRecipe.id, recipe, rows); setEditing(null) }} />}
    </>
  )
}
