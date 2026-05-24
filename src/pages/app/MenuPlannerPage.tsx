import { Brain, Plus, ShoppingCart } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import AddRecipeToSlotDialog from '../../features/menu-planner/components/AddRecipeToSlotDialog'
import MealSlotContent from '../../features/menu-planner/components/MealSlotContent'
import {
  Button,
  Card,
  Field,
  PageHeader,
  ReadOnlyNotice,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { mealTimes } from '../../features/shared/chefUtils'
import { useAppData } from '../../lib/AppState'
import type { MealTime, Recipe } from '../../lib/types'
import { addDays, safeDate, todayIso, uid } from '../../lib/utils'
import { validateRecipeForFamily } from '../../services/allergyShield'
import { calculateVarietyScore, validateRecipeRotation } from '../../services/menuRotationEngine'
import { calculateRecipeNutrition } from '../../services/nutritionEngine'
import { calculateProductionRows } from '../../services/portionEngine'

export default function MenuPlannerPage() {
  const { t } = useTranslation()
  const { data, addMenuPlan, addMenuPlanItem, setData } = useAppData()
  const canWrite = useCanWrite()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const [weekStart, setWeekStart] = useState(todayIso())
  const [slot, setSlot] = useState<{ date: string; mealTime: MealTime; familyId: string } | null>(null)
  const [error, setError] = useState('')
  const familySelectRef = useRef<HTMLSelectElement>(null)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const familyItems = data.menuPlanItems.filter((item) => data.menuPlans.find((plan) => plan.id === item.menu_plan_id)?.family_id === familyId && weekDays.includes(item.planned_date))
  const familyDiners = data.familyMembers.filter((diner) => diner.family_id === familyId && diner.is_active)
  const varietyScore = calculateVarietyScore(familyItems, data.recipes)
  const plan = data.menuPlans.find((item) => item.family_id === familyId && item.start_date === weekStart) || data.menuPlans.find((item) => item.family_id === familyId)

  const generateShopping = () => {
    const recipes = familyItems.map((item) => data.recipes.find((recipe) => recipe.id === item.recipe_id)).filter(Boolean) as Recipe[]
    const rows = calculateProductionRows(recipes, data.recipeIngredients, data.ingredients, familyDiners, data.pantryInventory.filter((item) => item.family_id === familyId))
    setData((current) => {
      const list = current.shoppingLists.find((item) => item.family_id === familyId && item.menu_plan_id === plan?.id) || {
        id: uid('shopping-list'),
        family_id: familyId,
        menu_plan_id: plan?.id,
        name: t('shopping.title'),
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return {
        ...current,
        shoppingLists: current.shoppingLists.some((item) => item.id === list.id) ? current.shoppingLists : [list, ...current.shoppingLists],
        shoppingListItems: [
          ...rows.filter((row) => row.missingQuantity > 0).map((row) => ({ id: uid('shopping-item'), shopping_list_id: list.id, ingredient_id: row.ingredientId, required_quantity: row.requiredQuantity, available_quantity: row.availableQuantity, missing_quantity: row.missingQuantity, unit: row.unit, is_checked: false, notes: '', created_at: new Date().toISOString() })),
          ...current.shoppingListItems.filter((item) => item.shopping_list_id !== list.id),
        ],
      }
    })
  }

  return (
    <>
      <PageHeader
        title={t('planner.title')}
        subtitle={t('planner.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            {canWrite && <Button variant="secondary" onClick={generateShopping}><ShoppingCart className="h-4 w-4" />{t('planner.generateShopping')}</Button>}
            <Link to="/app/portion-calculator" className="inline-flex rounded-md bg-forest-700 px-4 py-2 text-sm font-semibold text-white">{t('planner.calculateGrams')}</Link>
            <Link to="/app/ai-chef" className="inline-flex rounded-md bg-ai-600 px-4 py-2 text-sm font-semibold text-white"><Brain className="h-4 w-4" />{t('planner.completeWithAi')}</Link>
            {!canWrite && <ReadOnlyNotice />}
          </div>
        )}
      />
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t('planner.selectFamily')}><select ref={familySelectRef} className="input" value={familyId} onChange={(event) => setFamilyId(event.target.value)} data-testid="planner-family">{data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></Field>
          <Field label={t('planner.selectWeek')}><input className="input" type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} data-testid="planner-week" /></Field>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3"><p className="text-sm text-slate-500">{t('dashboard.weeklyVariety')}</p><p className="text-2xl font-semibold">{varietyScore}%</p></div>
        </div>
        {error && <p className="mt-4 rounded-md bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
        <div className="mt-6 overflow-x-auto">
          <div className="grid min-w-[1100px] grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div key={day} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="font-semibold">{safeDate(day)}</p>
                <div className="mt-3 grid gap-2">
                  {mealTimes.map((mealTime) => {
                    const item = familyItems.find((candidate) => candidate.planned_date === day && candidate.meal_time === mealTime)
                    const recipe = item ? data.recipes.find((candidate) => candidate.id === item.recipe_id) : undefined
                    return (
                      <div key={mealTime} className="rounded-md border border-stone-200 bg-white p-2" data-testid={`slot-${mealTime}`}>
                        <p className="text-xs font-semibold text-slate-500">{t(`planner.${mealTime}`)}</p>
                        {item && recipe ? <MealSlotContent item={item} recipe={recipe} /> : canWrite ? <Button variant="ghost" className="mt-2 w-full justify-start px-2 py-1 text-xs" onClick={() => { const selectedFamilyId = familySelectRef.current?.value || familyId; setFamilyId(selectedFamilyId); setError(''); setSlot({ date: day, mealTime, familyId: selectedFamilyId }) }}><Plus className="h-3 w-3" />{t('planner.addRecipe')}</Button> : <ReadOnlyNotice />}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      {canWrite && slot && (
        <AddRecipeToSlotDialog
          familyId={slot.familyId}
          slot={slot}
          plan={data.menuPlans.find((item) => item.family_id === slot.familyId && item.start_date === weekStart) || data.menuPlans.find((item) => item.family_id === slot.familyId)}
          onClose={() => setSlot(null)}
          onSubmit={({ recipeId, dinerId, overrideReason }) => {
            const recipe = data.recipes.find((item) => item.id === recipeId)
            if (!recipe) return
            const activePlan = data.menuPlans.find((item) => item.family_id === slot.familyId && item.start_date === weekStart) || data.menuPlans.find((item) => item.family_id === slot.familyId) || addMenuPlan({ family_id: slot.familyId, name: `${t('planner.weeklyView')} ${weekStart}`, start_date: weekStart, end_date: addDays(weekStart, 6), status: 'planned' })
            const slotFamilyDiners = data.familyMembers.filter((diner) => diner.family_id === slot.familyId && diner.is_active)
            const diners = dinerId === 'all' ? slotFamilyDiners : slotFamilyDiners.filter((diner) => diner.id === dinerId)
            const safety = validateRecipeForFamily(recipe, diners, data.allergies, data.recipeIngredients, data.ingredients)
            const allergyStatus = safety.some((row) => row.status === 'blocked') ? 'blocked' : safety.some((row) => row.status === 'review_needed') ? 'review_needed' : 'safe'
            const rotation = validateRecipeRotation(recipe, slot.date, data.menuPlanItems, data.settings.default_variety_days, overrideReason)
            if ((allergyStatus === 'blocked' || rotation.status === 'blocked') && !overrideReason) {
              setError(t('validation.overrideRequired'))
              return
            }
            const nutrition = calculateRecipeNutrition(recipe, data.recipeIngredients, data.ingredients)
            addMenuPlanItem({ menu_plan_id: activePlan.id, family_member_id: dinerId === 'all' ? undefined : dinerId, recipe_id: recipe.id, planned_date: slot.date, meal_time: slot.mealTime, servings: 1, portion_factor: 1, planned_grams: recipe.serving_size_g, calories: nutrition.calories_per_serving, protein_g: nutrition.protein_g_per_serving, allergy_status: allergyStatus, variety_status: rotation.status, override_reason: overrideReason })
            setSlot(null)
          }}
        />
      )}
    </>
  )
}
