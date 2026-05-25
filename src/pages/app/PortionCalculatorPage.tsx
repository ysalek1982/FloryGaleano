import { Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import { ExportMenu } from '../../features/exports/components/ExportMenu'
import { createExportLabels } from '../../features/exports/utils/exportFormatters'
import BatchSummaryTable from '../../features/portions/components/BatchSummaryTable'
import ChefProductionTable from '../../features/portions/components/ChefProductionTable'
import DinerPortionTable from '../../features/portions/components/DinerPortionTable'
import { Button, Card, Field, PageHeader } from '../../features/shared/chefUi'
import { useAppData } from '../../lib/AppState'
import { addDays, todayIso } from '../../lib/utils'
import {
  calculateBatchSummary,
  calculateDinerPortions,
  calculateProductionRows,
} from '../../services/portionEngine'

export default function PortionCalculatorPage() {
  const { t } = useTranslation()
  const { data } = useAppData()
  const [recipeId, setRecipeId] = useState(data.recipes[2]?.id || data.recipes[0]?.id)
  const family = data.families[0]
  const diners = data.familyMembers.filter((diner) => diner.family_id === family?.id && diner.is_active)
  const recipe = data.recipes.find((candidate) => candidate.id === recipeId) || data.recipes[0]
  const dinerRows = recipe ? calculateDinerPortions(recipe, data.recipeIngredients, data.ingredients, diners) : []
  const productionRows = recipe ? calculateProductionRows([recipe], data.recipeIngredients, data.ingredients, diners, data.pantryInventory) : []
  const batchRows = recipe ? calculateBatchSummary([recipe], data.recipeIngredients, diners) : []
  const exportReport = {
    title: t('portion.productionQuantities'),
    fileName: `${t('portion.productionQuantities')} ${family?.name || ''}`,
    familyName: family?.name || '',
    dateRange: `${todayIso()} - ${addDays(todayIso(), 6)}`,
    generatedAt: new Date().toLocaleString(),
    labels: createExportLabels(t),
    sheets: [
      {
        name: t('portion.dinerPortions'),
        rows: dinerRows.map((row) => ({
          [t('common.diner')]: row.dinerName,
          [t('common.recipe')]: row.recipeName,
          [t('diners.portionFactor')]: row.portionFactor,
          [t('portion.servingEquivalent')]: row.servingEquivalent,
          [t('portion.plannedGrams')]: Math.round(row.plannedGrams),
          [t('common.calories')]: Math.round(row.calories),
          [t('common.protein')]: Math.round(row.protein_g),
        })),
      },
      {
        name: t('portion.productionQuantities'),
        rows: productionRows.map((row) => ({
          [t('common.ingredient')]: row.ingredientName,
          [t('common.required')]: Math.round(row.requiredQuantity),
          [t('common.available')]: Math.round(row.availableQuantity),
          [t('common.missing')]: Math.round(row.missingQuantity),
          [t('portion.usedInRecipes')]: row.usedInRecipes.join(', '),
        })),
      },
    ],
  }

  return (
    <>
      <PageHeader
        title={t('portion.title')}
        subtitle={t('portion.subtitle')}
        action={<div className="flex flex-wrap gap-2"><AiCopilotButton compact context={{ page_id: 'portion_calculator', selected_family_id: family?.id, selected_recipe_id: recipe?.id, relevant_records: { production_rows: productionRows.length } }} actionKey="portionCalculator.explainGrams" labelKey="aiCopilot.actions.portionCalculator.explainGrams.label" testId="portion-ai-explain" /><Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('common.print')}</Button><ExportMenu report={exportReport} testIdPrefix="portion-export" /></div>}
      />
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t('common.family')}><select className="input" value={family?.id || ''} disabled>{data.families.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label={t('portion.selectRecipe')}><select className="input" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}>{data.recipes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label={t('portion.dateRange')}><input className="input" value={`${todayIso()} - ${addDays(todayIso(), 6)}`} readOnly /></Field>
        </div>
      </Card>
      <div className="mt-5 grid gap-5">
        <DinerPortionTable rows={dinerRows} />
        <ChefProductionTable rows={productionRows} />
        <BatchSummaryTable rows={batchRows} />
      </div>
    </>
  )
}
