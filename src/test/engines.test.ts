import { describe, expect, it } from 'vitest'
import { demoData, ingredients } from '../lib/demoData'
import { addDays, todayIso } from '../lib/utils'
import { validateIngredientForDiner } from '../services/allergyShield'
import { generateAlerts } from '../services/alertsEngine'
import { calculateRecipeNutrition } from '../services/nutritionEngine'
import { calculateProductionRows } from '../services/portionEngine'
import { validateRecipeRotation } from '../services/menuRotationEngine'

const soren = demoData.familyMembers.find((diner) => diner.nickname === 'Soren')!
const sorenAllergies = demoData.allergies.filter((allergy) => allergy.family_member_id === soren.id)

function ingredientByName(name: string) {
  return ingredients.find((ingredient) => ingredient.name === name)!
}

describe('Nutrition Engine', () => {
  it('calculates nutrients by 100 g and serving', () => {
    const recipe = demoData.recipes.find((item) => item.id === 'rec-turkey-meatballs')!
    const nutrition = calculateRecipeNutrition(recipe, demoData.recipeIngredients, demoData.ingredients)

    expect(Math.round(nutrition.total_calories)).toBe(2473)
    expect(Math.round(nutrition.calories_per_serving)).toBe(618)
    expect(Math.round(nutrition.protein_g_per_serving)).toBe(58)
  })

  it('recalculates when ingredient grams change', () => {
    const recipe = demoData.recipes.find((item) => item.id === 'rec-turkey-meatballs')!
    const base = calculateRecipeNutrition(recipe, demoData.recipeIngredients, demoData.ingredients)
    const changedRows = demoData.recipeIngredients.map((row) =>
      row.recipe_id === recipe.id && row.ingredient_id === 'ing-ground-turkey'
        ? { ...row, quantity_g: row.quantity_g + 100 }
        : row,
    )
    const changed = calculateRecipeNutrition(recipe, changedRows, demoData.ingredients)

    expect(changed.total_calories).toBeGreaterThan(base.total_calories)
    expect(changed.total_protein_g).toBeGreaterThan(base.total_protein_g)
  })
})

describe('Portion Engine', () => {
  it('calculates grams by diner and total grams by family', () => {
    const recipe = demoData.recipes.find((item) => item.id === 'rec-turkey-meatballs')!
    const diners = demoData.familyMembers.filter((diner) => diner.family_id === demoData.families[0].id)
    const production = calculateProductionRows(
      [recipe],
      demoData.recipeIngredients,
      demoData.ingredients,
      diners,
      demoData.pantryInventory,
    )
    const turkey = production.find((row) => row.ingredientName === 'Ground turkey')!

    expect(Math.round(turkey.requiredQuantity)).toBe(680)
    expect(Math.round(turkey.availableQuantity)).toBe(300)
    expect(Math.round(turkey.missingQuantity)).toBe(380)
  })
})

describe('Allergy Shield', () => {
  it.each([
    ['Wheat', 'blocked'],
    ['Sesame', 'blocked'],
    ['Tahini', 'blocked'],
    ['Almonds', 'safe'],
    ['Sunflower oil', 'safe'],
    ['Sunflower lecithin', 'safe'],
    ['Sunflower seeds', 'blocked'],
    ['Red lentils', 'safe'],
    ['Generic lentils', 'review_needed'],
  ])('validates %s as %s for Soren', (name, expected) => {
    const result = validateIngredientForDiner(ingredientByName(name), sorenAllergies)
    expect(result.status).toBe(expected)
  })
})

describe('Menu Rotation Engine', () => {
  it('blocks recipes served 10 days ago and allows recipes served after 22 days', () => {
    const recipe = demoData.recipes.find((item) => item.id === 'rec-gf-pizza')!
    const blocked = validateRecipeRotation(recipe, todayIso(), demoData.menuPlanItems, 21)
    const allowed = validateRecipeRotation(recipe, addDays(todayIso(), 12), demoData.menuPlanItems, 21)

    expect(blocked.status).toBe('blocked')
    expect(blocked.overrideRequired).toBe(true)
    expect(allowed.status).toBe('allowed')
  })

  it('requires justification for overrides', () => {
    const recipe = demoData.recipes.find((item) => item.id === 'rec-gf-pizza')!
    const result = validateRecipeRotation(recipe, todayIso(), demoData.menuPlanItems, 21, 'Family approved for party menu.')

    expect(result.status).toBe('warning')
    expect(result.overrideRequired).toBe(false)
  })
})

describe('Alerts Engine', () => {
  it('generates operational alerts for missing ingredients, nutrition, allergy blocks, and freezer expiration', () => {
    const alerts = generateAlerts({
      family: demoData.families[0],
      diners: demoData.familyMembers,
      allergies: demoData.allergies,
      ingredients: demoData.ingredients,
      recipes: demoData.recipes,
      recipeIngredients: demoData.recipeIngredients,
      menuItems: demoData.menuPlanItems,
      pantry: demoData.pantryInventory,
      freezer: demoData.freezerInventory,
      settings: demoData.settings,
    })

    expect(alerts.some((alert) => alert.type === 'missing_ingredient')).toBe(true)
    expect(alerts.some((alert) => alert.type === 'low_calories')).toBe(true)
    expect(alerts.some((alert) => alert.type === 'low_protein')).toBe(true)
    expect(alerts.some((alert) => alert.type === 'blocked_recipe')).toBe(true)
    expect(alerts.some((alert) => alert.type === 'freezer_expiring')).toBe(true)
  })
})
