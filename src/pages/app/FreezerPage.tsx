import { Plus, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FreezerBatchSummary } from '../../features/freezer/components/FreezerBatchSummary'
import { FreezerExpirationPanel } from '../../features/freezer/components/FreezerExpirationPanel'
import { FreezerItemDialog } from '../../features/freezer/components/FreezerItemDialog'
import { FreezerPortionTracker } from '../../features/freezer/components/FreezerPortionTracker'
import { FreezerTable } from '../../features/freezer/components/FreezerTable'
import { FreezerUseInMenuDialog } from '../../features/freezer/components/FreezerUseInMenuDialog'
import { useFreezerState } from '../../features/freezer/hooks/useFreezerState'
import { FreezerFirstSuggestions } from '../../features/inventory-forecast/components/FreezerFirstSuggestions'
import { InventoryForecastPanel } from '../../features/inventory-forecast/components/InventoryForecastPanel'
import { useInventoryForecast } from '../../features/inventory-forecast/hooks/useInventoryForecast'
import { Button, Card, EmptyState, Field, PageHeader, ReadOnlyNotice, SimpleList } from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'
import type { MealTime } from '../../lib/types'
import { addDays } from '../../lib/utils'
import { validateRecipeForFamily } from '../../services/allergyShield'
import { calculateRecipeNutrition } from '../../services/nutritionEngine'

export default function FreezerPage() {
  const { t } = useTranslation()
  const { addFreezerItem, updateFreezerItem, addMenuPlan, addMenuPlanItem } = useAppData()
  const canWrite = useCanWrite()
  const freezer = useFreezerState()
  const inventoryForecast = useInventoryForecast(freezer.familyId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const editingItem = freezer.data.freezerInventory.find((item) => item.id === editing)
  const menuItem = freezer.data.freezerInventory.find((item) => item.id === menuItemId)

  const addToMenu = (freezerItemId: string, plannedDate: string, mealTime: string) => {
    const item = freezer.data.freezerInventory.find((candidate) => candidate.id === freezerItemId)
    const recipe = freezer.data.recipes.find((candidate) => candidate.id === item?.recipe_id)
    if (!item || !recipe) return
    const plan = freezer.data.menuPlans.find((candidate) => candidate.family_id === item.family_id && candidate.start_date <= plannedDate && candidate.end_date >= plannedDate)
      || addMenuPlan({ family_id: item.family_id, name: `${t('freezer.title')} ${plannedDate}`, start_date: plannedDate, end_date: addDays(plannedDate, 6), status: 'planned' })
    const diners = freezer.data.familyMembers.filter((diner) => diner.family_id === item.family_id && diner.is_active)
    const safety = validateRecipeForFamily(recipe, diners, freezer.data.allergies, freezer.data.recipeIngredients, freezer.data.ingredients)
    const nutrition = calculateRecipeNutrition(recipe, freezer.data.recipeIngredients, freezer.data.ingredients)
    addMenuPlanItem({
      menu_plan_id: plan.id,
      recipe_id: recipe.id,
      planned_date: plannedDate,
      meal_time: mealTime as MealTime,
      servings: 1,
      portion_factor: 1,
      planned_grams: item.grams_per_portion,
      calories: nutrition.calories_per_serving,
      protein_g: nutrition.protein_g_per_serving,
      allergy_status: safety.some((row) => row.status === 'blocked') ? 'blocked' : safety.some((row) => row.status === 'review_needed') ? 'review_needed' : 'safe',
      variety_status: 'allowed',
      notes: t('freezer.fromFreezerInventory'),
    })
    updateFreezerItem(item.id, { portions_available: Math.max(0, item.portions_available - 1) })
    setMenuItemId(null)
  }

  return (
    <>
      <PageHeader
        title={t('freezer.title')}
        subtitle={t('freezer.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <Button onClick={() => setOpen(true)} data-testid="create-freezer-item">
                <Plus className="h-4 w-4" />
                {t('freezer.addItem')}
              </Button>
            ) : (
              <ReadOnlyNotice />
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('freezer.printInventory')}
            </Button>
          </div>
        }
      />

      <Card className="mb-5 print:hidden">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t('common.family')}>
            <select className="input" value={freezer.familyId} onChange={(event) => freezer.setFamilyId(event.target.value)} data-testid="freezer-family">
              <option value="all">{t('common.all')}</option>
              {freezer.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
          </Field>
          <Field label={t('common.filter')}>
            <select className="input" value={freezer.filter} onChange={(event) => freezer.setFilter(event.target.value as 'all' | 'expiring' | 'low')} data-testid="freezer-filter">
              <option value="all">{t('common.all')}</option>
              <option value="expiring">{t('freezer.expiringSoon')}</option>
              <option value="low">{t('freezer.lowPortions')}</option>
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-5">
        <InventoryForecastPanel forecast={inventoryForecast.forecast} />
        <div className="grid gap-5 xl:grid-cols-3">
          <FreezerExpirationPanel freezer={freezer} />
          <FreezerPortionTracker freezer={freezer} />
          <FreezerFirstSuggestions suggestions={inventoryForecast.forecast.freezerFirstSuggestions} onApply={(suggestion) => setMenuItemId(suggestion.item.id)} />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <Card>
            <h2 className="font-serif text-2xl font-semibold">{t('freezer.suggestions')}</h2>
            <div className="mt-4">
              {freezer.freezerFriendlyRecipes.length ? (
                <SimpleList items={freezer.freezerFriendlyRecipes.slice(0, 5).map((recipe) => recipe.name)} />
              ) : (
                <EmptyState text={t('freezer.noSuggestions')} />
              )}
            </div>
          </Card>
        </div>
        <Card>
          <h2 className="mb-4 font-serif text-2xl font-semibold">{t('freezer.inventory')}</h2>
          <FreezerTable
            freezer={freezer}
            canWrite={canWrite}
            onEdit={setEditing}
            onUse={(itemId, portions) => updateFreezerItem(itemId, { portions_available: portions })}
            onAddToMenu={setMenuItemId}
          />
        </Card>
        <FreezerBatchSummary freezer={freezer} />
      </div>

      {canWrite && open && (
        <FreezerItemDialog
          onClose={() => setOpen(false)}
          onSubmit={(values) => {
            addFreezerItem(values)
            setOpen(false)
          }}
        />
      )}
      {canWrite && editingItem && (
        <FreezerItemDialog
          item={editingItem}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateFreezerItem(editingItem.id, values)
            setEditing(null)
          }}
        />
      )}
      {canWrite && menuItem && (
        <FreezerUseInMenuDialog
          item={menuItem}
          onClose={() => setMenuItemId(null)}
          onSubmit={(values) => addToMenu(menuItem.id, values.planned_date, values.meal_time)}
        />
      )}
    </>
  )
}
