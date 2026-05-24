import type { TFunction } from 'i18next'

import type { ExportReport, ExportSheet } from '../../exports/types'
import { createExportLabels } from '../../exports/utils/exportFormatters'
import type { ReportType, useReportsData } from '../hooks/useReportsData'

type ReportsData = ReturnType<typeof useReportsData>

function quantity(value: number, unit = 'g') {
  return `${Math.round(value)} ${unit}`
}

function selectedSheets(reportType: ReportType, sheets: Record<Exclude<ReportType, 'all'>, ExportSheet>) {
  if (reportType === 'all') return Object.values(sheets)
  return [sheets[reportType]]
}

export function buildReportExport(reports: ReportsData, t: TFunction): ExportReport {
  const recipeById = new Map(reports.data.recipes.map((recipe) => [recipe.id, recipe]))
  const ingredientById = new Map(reports.data.ingredients.map((ingredient) => [ingredient.id, ingredient]))
  const dinerById = new Map(reports.diners.map((diner) => [diner.id, diner]))

  const sheets: Record<Exclude<ReportType, 'all'>, ExportSheet> = {
    weeklyMenu: {
      name: t('reports.types.weeklyMenu'),
      rows: reports.menuItems.map((item) => ({
        [t('common.date')]: item.planned_date,
        [t('common.meal')]: t(`planner.${item.meal_time}`),
        [t('common.recipe')]: recipeById.get(item.recipe_id)?.name || '',
        [t('common.diner')]: item.family_member_id ? dinerById.get(item.family_member_id)?.full_name : t('planner.assignAll'),
        [t('common.status')]: item.allergy_status,
      })),
    },
    dinerMenu: {
      name: t('reports.types.dinerMenu'),
      rows: reports.diners.flatMap((diner) => reports.menuItems.map((item) => ({
        [t('common.diner')]: diner.full_name,
        [t('common.date')]: item.planned_date,
        [t('common.meal')]: t(`planner.${item.meal_time}`),
        [t('common.recipe')]: recipeById.get(item.recipe_id)?.name || '',
        [t('common.calories')]: Math.round(item.calories || 0),
        [t('common.protein')]: Math.round(item.protein_g || 0),
      }))),
    },
    productionSheet: {
      name: t('reports.types.productionSheet'),
      rows: reports.productionRows.map((row) => ({
        [t('common.ingredient')]: row.ingredientName,
        [t('common.required')]: quantity(row.requiredQuantity, row.unit),
        [t('common.available')]: quantity(row.availableQuantity, row.unit),
        [t('common.missing')]: quantity(row.missingQuantity, row.unit),
        [t('portion.usedInRecipes')]: row.usedInRecipes.join(', '),
        [t('reports.allergyWarnings')]: row.allergyNotes.join(', '),
      })),
    },
    shoppingList: {
      name: t('reports.types.shoppingList'),
      rows: reports.shoppingItems.map((item) => {
        const ingredient = ingredientById.get(item.ingredient_id)
        return {
          [t('common.category')]: ingredient?.category || '',
          [t('common.ingredient')]: ingredient?.name || '',
          [t('common.required')]: quantity(item.required_quantity, item.unit),
          [t('common.available')]: quantity(item.available_quantity, item.unit),
          [t('common.missing')]: quantity(item.missing_quantity, item.unit),
          [t('shopping.purchased')]: item.is_checked ? t('common.yes') : t('common.no'),
        }
      }),
    },
    missingIngredients: {
      name: t('reports.types.missingIngredients'),
      rows: reports.missingRows.map((row) => ({
        [t('common.ingredient')]: row.ingredientName,
        [t('common.required')]: quantity(row.requiredQuantity, row.unit),
        [t('common.available')]: quantity(row.availableQuantity, row.unit),
        [t('common.missing')]: quantity(row.missingQuantity, row.unit),
        [t('portion.usedInRecipes')]: row.usedInRecipes.join(', '),
      })),
    },
    allergyReport: {
      name: t('reports.types.allergyReport'),
      rows: reports.allergies.map((allergy) => ({
        [t('common.diner')]: dinerById.get(allergy.family_member_id)?.full_name || '',
        [t('allergies.matchedAllergen')]: allergy.allergen_name,
        [t('common.severity')]: allergy.severity,
        [t('allergies.avoidTraces')]: allergy.avoid_traces ? t('common.yes') : t('common.no'),
        [t('allergies.crossContactRisk')]: allergy.cross_contact_risk ? t('common.yes') : t('common.no'),
      })),
    },
    nutritionReport: {
      name: t('reports.types.nutritionReport'),
      rows: reports.nutritionRows.map(({ recipe, nutrition }) => ({
        [t('common.recipe')]: recipe.name,
        [t('common.calories')]: Math.round(nutrition.calories_per_serving),
        [t('common.protein')]: Math.round(nutrition.protein_g_per_serving),
        [t('common.carbs')]: Math.round(nutrition.carbs_g_per_serving),
        [t('common.fat')]: Math.round(nutrition.fat_g_per_serving),
      })),
    },
    freezerReport: {
      name: t('reports.types.freezerReport'),
      rows: reports.freezerRows.map((item) => ({
        [t('common.recipe')]: recipeById.get(item.recipe_id)?.name || '',
        [t('freezer.preparedDate')]: item.prepared_date || '',
        [t('freezer.expirationDate')]: item.expiration_date || '',
        [t('freezer.portionsAvailable')]: item.portions_available,
        [t('freezer.gramsPerPortion')]: quantity(item.grams_per_portion || 0),
        [t('recipes.reheating')]: item.reheating_instructions || '',
      })),
    },
    pantryLow: {
      name: t('reports.types.pantryLow'),
      rows: reports.lowStock.map((item) => {
        const ingredient = ingredientById.get(item.ingredient_id)
        return {
          [t('common.ingredient')]: ingredient?.name || '',
          [t('common.available')]: quantity(item.quantity_available, item.unit),
          [t('pantry.minimumAlert')]: quantity(item.min_quantity_alert, item.unit),
          [t('pantry.location')]: item.location || '',
          [t('pantry.expirationDate')]: item.expiration_date || '',
        }
      }),
    },
  }

  const title = t(`reports.types.${reports.reportType}`)
  return {
    title,
    fileName: `${title} ${reports.family?.name || t('common.family')}`,
    familyName: reports.family?.name || '',
    dateRange: reports.dateRange,
    generatedAt: reports.generatedAt,
    sheets: selectedSheets(reports.reportType, sheets),
    labels: createExportLabels(t),
  }
}
