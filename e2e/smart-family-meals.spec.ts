import { expect, test, type Download, type Page } from '@playwright/test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type QaUser = {
  id: string
  email: string
  password: string
}

const root = resolve(import.meta.dirname, '..')
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
const e2ePrefix = `SFM E2E ${runId}`
let qaUser: QaUser
let viewerUser: QaUser
let admin: SupabaseClient
const familyName = `${e2ePrefix} Family`
const dinerName = `${e2ePrefix} Diner`
const ingredientName = `${e2ePrefix} Quinoa`
const recipeName = `${e2ePrefix} Bowl`
const blockedRecipeName = `${e2ePrefix} Sesame Plate`
const spanishIngredientName = `${e2ePrefix} Maiz`

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  loadEnv(resolve(root, '.env.local'))
  admin = adminClient()
  qaUser = await ensureQaUser({ email: 'qa-e2e+sfm@example.com', fullName: 'QA E2E Chef', role: 'chef' })
  viewerUser = await ensureQaUser({ email: 'qa-e2e+sfm-viewer@example.com', fullName: 'QA E2E Viewer', role: 'viewer' })
  await seedDemoWorkspace(qaUser)
  await assignViewerToSeedFamily()
})

test.afterAll(async () => {
  if (!admin) return
  await cleanupE2eData()
})

test('public/auth flow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Smart Family Meals').first()).toBeVisible()
  await page.locator('select').first().selectOption('es')
  await expect(page.getByText('Empezar a Planificar').first()).toBeVisible()

  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText(/Use demo workspace|Usar espacio demo/i)).toHaveCount(0)

  await login(page)
  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.getByTestId('family-selector')).toBeVisible()
})

test('seeded workspace is visible after login', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('family-selector')).toContainText('Galeano Family')
  await page.goto('/app/families')
  await expect(page.getByTestId('family-card').filter({ hasText: 'Galeano Family' }).first()).toBeVisible()
})

test('family detail tabs render seeded operational data', async ({ page }) => {
  await login(page)
  await page.goto('/app/families')
  await page.getByTestId('family-card').filter({ hasText: 'Galeano Family' }).first().click()
  await expect(page.getByTestId('family-detail-tabs')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  for (const tab of ['Diners', 'Weekly Menu', 'Pantry', 'Freezer', 'Shopping List', 'Alerts', 'Reports']) {
    await page.getByTestId('family-detail-tabs').getByRole('button', { name: tab }).click()
    await expect(page.getByText(tab).first()).toBeVisible()
  }
})

test('family and diner flow persists after reload', async ({ page }) => {
  await login(page)
  await page.goto('/app/families')
  await page.getByRole('button', { name: /Create Family/i }).click()
  await page.getByTestId('family-form').getByLabel('Name').fill(familyName)
  await page.getByTestId('family-form').getByLabel('Primary Contact').fill('E2E Chef')
  await page.getByTestId('save-family').click()
  await expect(page.getByTestId('family-card').filter({ hasText: familyName }).first()).toBeVisible()
  await waitForRemoteRow('families', 'name', familyName)

  await page.reload()
  await page.getByTestId('families-search').fill(familyName)
  await expect(page.getByTestId('family-card').filter({ hasText: familyName }).first()).toBeVisible()

  await page.goto('/app/diners')
  await page.getByTestId('create-diner').click()
  await page.getByTestId('diner-form').getByLabel('Family').selectOption({ label: familyName })
  await page.getByTestId('diner-form').getByLabel('Full Name').fill(dinerName)
  await page.getByTestId('diner-form').getByLabel('Age').fill('11')
  await page.getByTestId('diner-form').getByLabel('Portion Factor').fill('1.2')
  await page.getByTestId('diner-form').getByLabel('Daily Calorie Target').fill('1900')
  await page.getByTestId('diner-form').getByLabel('Daily Protein Target').fill('75')
  await page.getByTestId('diner-form').getByLabel('Ingredient').fill('sesame')
  await page.getByTestId('diner-form').getByLabel('Preference Item').fill('beef')
  await page.getByTestId('diner-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(page.getByText(dinerName).first()).toBeVisible()
  await waitForRemoteRow('family_members', 'full_name', dinerName)

  await page.reload()
  await expect(page.getByText(dinerName).first()).toBeVisible()
})

test('ingredient and recipe flow calculates nutrition and safety', async ({ page }) => {
  await login(page)
  await page.goto('/app/ingredients')
  await page.getByTestId('create-ingredient').click()
  const ingredientForm = page.getByTestId('ingredient-form')
  await ingredientForm.getByLabel('Name').fill(ingredientName)
  await ingredientForm.getByTestId('food-category-search').fill('protein')
  await ingredientForm.getByTestId('food-category-option-proteins').click()
  await ingredientForm.getByLabel('Calories').fill('120')
  await ingredientForm.getByLabel('Protein').fill('4')
  await ingredientForm.getByLabel('Carbs').fill('21')
  await ingredientForm.getByLabel('Fat').fill('2')
  await ingredientForm.getByRole('button', { name: /^Save$/i }).click()
  await waitForRemoteRow('ingredients', 'name', ingredientName)
  await page.getByTestId('ingredient-search').fill(ingredientName)
  await expect(page.getByText(ingredientName).first()).toBeVisible()
  await expect(page.locator('table').getByText('Proteins').first()).toBeVisible()

  await page.goto('/app/recipes')
  await page.getByTestId('create-recipe').click()
  const recipeBuilder = page.getByTestId('recipe-builder')
  const recipeForm = page.getByTestId('recipe-form')
  await recipeForm.getByLabel('Name').fill(recipeName)
  await recipeForm.getByLabel('Description').fill('E2E chef workflow recipe')
  await recipeForm.getByLabel('Recipe Image URL').fill('https://example.com/smart-family-meals-recipe.jpg')
  await recipeForm.getByLabel('Servings').fill('2')
  await recipeBuilder.getByRole('button', { name: /^Ingredients$/i }).click()
  await recipeForm.getByLabel('Ingredient').selectOption({ label: ingredientName })
  await recipeForm.getByLabel('Quantity in Grams').fill('200')
  await recipeBuilder.getByRole('button', { name: /^Instructions$/i }).click()
  await recipeForm.getByLabel('Instructions', { exact: true }).fill('Cook and serve warm.')
  await recipeBuilder.getByRole('button', { name: /^Nutrition$/i }).click()
  await expect(recipeForm.getByText('240')).toBeVisible()
  await recipeBuilder.getByRole('button', { name: /^Safety$/i }).click()
  await expect(recipeForm.getByText(/Safe|Review Needed|Blocked/i).first()).toBeVisible()
  await recipeBuilder.getByRole('button', { name: /^Usage$/i }).click()
  await recipeForm.getByLabel('Status').selectOption('active')
  await recipeForm.getByRole('button', { name: /^Save$/i }).click()
  await waitForRemoteRow('recipes', 'name', recipeName)
  await waitForRecipeIngredients(recipeName)
  await page.getByTestId('recipe-search').fill(recipeName)
  await expect(page.getByText(recipeName).first()).toBeVisible()
  await expect(page.getByRole('img', { name: recipeName }).first()).toBeVisible()
})

test('recipe image URL can be edited and persists after reload', async ({ page }) => {
  const updatedImageUrl = 'https://example.com/smart-family-meals-updated-recipe.jpg'
  await login(page)
  await page.goto('/app/recipes')
  await page.getByTestId('recipe-search').fill(recipeName)
  const recipeCard = page.locator('section').filter({ hasText: recipeName }).last()
  await recipeCard.getByRole('button', { name: 'Edit' }).click()
  await page.getByTestId('recipe-image-url').fill(updatedImageUrl)
  await page.getByTestId('recipe-form').getByRole('button', { name: /^Save$/i }).click()
  await waitForRecipeImage(recipeName, updatedImageUrl)
  await page.reload()
  await page.getByTestId('recipe-search').fill(recipeName)
  const image = page.getByRole('img', { name: recipeName }).first()
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', updatedImageUrl)
})

test('full chef happy path reaches menu, portions and shopping quantities', async ({ page }) => {
  await login(page)
  await page.goto('/app/menu-planner')
  await page.getByTestId('planner-family').selectOption({ label: familyName })
  await page.getByTestId('slot-dinner').first().getByRole('button', { name: /Add Recipe/i }).click()
  await page.getByTestId('menu-slot-form').getByLabel('Recipe').selectOption({ label: recipeName })
  await page.getByTestId('menu-slot-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(page.getByTestId('slot-dinner').first().getByText(recipeName)).toBeVisible()
  await expect(page.getByTestId('slot-dinner').first().getByText(/Safe|Review Needed|Blocked/i)).toBeVisible()

  await page.goto('/app/portion-calculator')
  await page.getByLabel('Select Recipe').selectOption({ label: recipeName })
  await expect(page.getByRole('heading', { name: 'Diner Portions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chef Production Quantities' })).toBeVisible()

  await page.goto('/app/shopping-list')
  await page.getByRole('button', { name: /Generate from Menu Plan/i }).click()
  await expect(page.getByText(/g$/).first()).toBeVisible()
  await expect.poll(async () => page.getByRole('checkbox').count(), { timeout: 15_000 }).toBeGreaterThan(0)
})

test('dashboard, allergy, nutrition and day planner workflows render operational panels', async ({ page }) => {
  await login(page)
  await page.goto('/app/dashboard')
  await expect(page.getByTestId('dashboard-stats')).toBeVisible()
  await expect(page.getByTestId('dashboard-action-rail')).toBeVisible()
  await expect(page.getByTestId('today-kitchen-plan')).toBeVisible()
  await expect(page.getByText('Family Overview').first()).toBeVisible()

  await page.goto('/app/allergies')
  await page.getByTestId('allergy-family').selectOption(await galeanoFamilyId())
  await page.getByTestId('allergy-diner').selectOption(await galeanoDinerId('Soren'))
  await page.getByTestId('allergy-ingredient').selectOption({ label: 'Wheat' })
  await expect(page.getByTestId('allergy-ingredient-result')).toContainText('Blocked')
  await page.getByTestId('allergy-ingredient').selectOption({ label: 'Almonds' })
  await expect(page.getByTestId('allergy-ingredient-result')).toContainText('Safe')
  await page.getByTestId('allergy-ingredient').selectOption({ label: 'Generic lentils' })
  await expect(page.getByTestId('allergy-ingredient-result')).toContainText('Review Needed')
  await page.getByTestId('allergy-recipe').selectOption({ label: 'Hummus with Tahini' })
  await expect(page.getByTestId('allergy-recipe-result')).toContainText('Blocked')
  await expect(page.getByText('Family Allergy Matrix').first()).toBeVisible()

  await page.goto('/app/nutrition')
  await expect(page.getByText('Target Progress').first()).toBeVisible()
  await expect(page.getByText('Macro & Mineral Distribution').first()).toBeVisible()
  await expect(page.getByText('Missing Nutrition Data').first()).toBeVisible()

  await page.goto('/app/day-planner')
  await page.getByTestId('day-family').selectOption({ label: familyName })
  await page.getByTestId('day-date').fill(isoDaysFromNow(210))
  const dinnerSlot = page.getByTestId('day-slot-dinner')
  await dinnerSlot.getByRole('button', { name: /Add Recipe/i }).click()
  await page.getByTestId('menu-slot-form').getByLabel('Recipe').selectOption({ label: recipeName })
  await page.getByTestId('menu-slot-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(dinnerSlot.getByText(recipeName)).toBeVisible()
  await expect(page.getByText('Day Nutrition Summary').first()).toBeVisible()
  await expect(page.getByText('Day Allergy Summary').first()).toBeVisible()
  await expect(page.getByText('Day Missing Ingredients').first()).toBeVisible()
})

test('blocked allergy recipe cannot be added to menu without override', async ({ page }) => {
  await login(page)
  await page.goto('/app/recipes')
  await page.getByTestId('create-recipe').click()
  const recipeBuilder = page.getByTestId('recipe-builder')
  const recipeForm = page.getByTestId('recipe-form')
  await recipeForm.getByLabel('Name').fill(blockedRecipeName)
  await recipeForm.getByLabel('Servings').fill('2')
  await recipeBuilder.getByRole('button', { name: /^Ingredients$/i }).click()
  await recipeForm.getByLabel('Ingredient').selectOption({ label: 'Sesame' })
  await recipeForm.getByLabel('Quantity in Grams').fill('100')
  await recipeBuilder.getByRole('button', { name: /^Safety$/i }).click()
  await expect(recipeForm.getByText(/Blocked/i).first()).toBeVisible()
  await recipeBuilder.getByRole('button', { name: /^Usage$/i }).click()
  await recipeForm.getByLabel('Status').selectOption('active')
  await recipeForm.getByRole('button', { name: /^Save$/i }).click()
  await waitForRemoteRow('recipes', 'name', blockedRecipeName)
  await waitForRecipeIngredients(blockedRecipeName)

  await page.goto('/app/menu-planner')
  await page.getByTestId('planner-family').selectOption({ label: 'Galeano Family' })
  await page.getByTestId('planner-week').fill(isoDaysFromNow(90))
  await page.getByTestId('slot-dinner').first().getByRole('button', { name: /Add Recipe/i }).click()
  await page.getByTestId('menu-slot-form').getByLabel('Recipe').selectOption({ label: blockedRecipeName })
  await page.getByTestId('menu-slot-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(page.getByText('Manual override requires a justification.').first()).toBeVisible()
})

test('menu rotation blocks repeated dish inside configured window', async ({ page }) => {
  await login(page)
  await page.goto('/app/menu-planner')
  await page.getByTestId('planner-family').selectOption({ label: familyName })
  await page.getByTestId('planner-week').fill(isoDaysFromNow(150))
  const dinnerSlots = page.getByTestId('slot-dinner')
  await dinnerSlots.nth(0).getByRole('button', { name: /Add Recipe/i }).click()
  await page.getByTestId('menu-slot-form').getByLabel('Recipe').selectOption({ label: recipeName })
  await page.getByTestId('menu-slot-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(dinnerSlots.nth(0).getByText(recipeName)).toBeVisible()

  await dinnerSlots.nth(1).getByRole('button', { name: /Add Recipe/i }).click()
  await page.getByTestId('menu-slot-form').getByLabel('Recipe').selectOption({ label: recipeName })
  await page.getByTestId('menu-slot-form').getByRole('button', { name: /^Save$/i }).click()
  await expect(page.getByText('Manual override requires a justification.').first()).toBeVisible()
})

test('viewer role sees assigned data but read-only controls are unavailable', async ({ page }) => {
  await login(page, viewerUser)
  await expect(page.getByTestId('role-indicator')).toContainText('Viewer')
  await page.goto('/app/families')
  await expect(page.getByTestId('family-card').filter({ hasText: 'Galeano Family' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Create Family/i })).toHaveCount(0)
  await expect(page.getByText('Read-only access').first()).toBeVisible()

  await page.goto('/app/diners')
  await expect(page.getByTestId('create-diner')).toHaveCount(0)
  await expect(page.getByText('Soren').first()).toBeVisible()

  await page.goto('/app/ingredients')
  await expect(page.getByTestId('create-ingredient')).toHaveCount(0)
  await expect(page.getByText('Read-only access').first()).toBeVisible()

  await page.goto('/app/recipes')
  await expect(page.getByTestId('create-recipe')).toHaveCount(0)
  await expect(page.getByText('Read-only access').first()).toBeVisible()
})

test('AI Chef renders structured validated suggestions without applying unsafe output', async ({ page }) => {
  await mockAiKeyConfigured(page)
  await page.route('**/functions/v1/ai-chef', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        action: 'generate_week_menu',
        suggestions: [
          {
            title: 'Safe Rice Bowl',
            ingredients: ['rice', 'chicken'],
            category_code: 'other',
            safety_status: 'safe',
            nutrition_status: 'available',
            rotation_status: 'allowed',
            usable: true,
            nutrition: { calories: 430, protein_g: 31 },
            safety_notes: ['Unknown category "chef_special" mapped to other.'],
          },
          {
            title: 'Sesame Tahini Plate',
            ingredients: ['tahini', 'sesame'],
            category_code: 'other',
            safety_status: 'blocked',
            nutrition_status: 'review_needed',
            rotation_status: 'allowed',
            usable: false,
          },
        ],
      }),
    })
  })

  await login(page)
  await page.goto('/app/ai-chef')
  await page.getByTestId('ai-action-weeklyMenu').click()
  await expect(page.getByRole('heading', { name: 'Safe Rice Bowl' })).toBeVisible()
  await expect(page.getByText('Unknown category "chef_special" mapped to other.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sesame Tahini Plate' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Structured JSON Output' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Apply Safe Suggestion/i }).nth(1)).toBeDisabled()
})

test('AI Chef renders validated weekly menu grid from structured output', async ({ page }) => {
  await mockAiKeyConfigured(page)
  await page.route('**/functions/v1/ai-chef', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        action: 'generate_validated_menu_plan',
        ai_key_source: 'user',
        candidate_recipe_count: 12,
        menu_plan: {
          title: 'Validated Week Draft',
          start_date: '2026-05-25',
          end_date: '2026-05-31',
          days: [
            {
              date: '2026-05-25',
              meals: [
                {
                  meal_time: 'dinner',
                  recipe_id: 'recipe-safe',
                  recipe_name: 'Safe Rice Bowl',
                  servings: 3,
                  diner_ids: ['all'],
                  reason: 'Candidate recipe passed server validation.',
                  category_codes: ['proteins'],
                  status: 'safe',
                  warnings: [],
                },
                {
                  meal_time: 'snack',
                  recipe_id: null,
                  recipe_name: 'New Lentil Idea',
                  servings: 1,
                  diner_ids: ['all'],
                  reason: 'New recipe suggestion only.',
                  category_codes: ['legumes'],
                  status: 'review_needed',
                  warnings: ['AI did not provide an existing recipe_id; treat as draft.'],
                },
              ],
            },
          ],
        },
        suggestions: [
          { title: 'Safe Rice Bowl', recipe_id: 'recipe-safe', safety_status: 'safe', usable: true, rotation_status: 'allowed', nutrition_status: 'available' },
          { title: 'New Lentil Idea', recipe_id: null, safety_status: 'review_needed', usable: false, rotation_status: 'review_needed', nutrition_status: 'review_needed' },
        ],
        validation_summary: { status: 'review_needed', reasons: ['12 candidate recipes considered before Gemini was called.'], warnings: [] },
      }),
    })
  })

  await login(page)
  await page.goto('/app/ai-chef')
  await page.getByTestId('ai-action-weeklyMenu').click()
  await expect(page.getByTestId('ai-menu-plan-grid')).toContainText('Validated Week Draft')
  await expect(page.getByTestId('ai-menu-plan-grid')).toContainText('dinner: Safe Rice Bowl')
  await expect(page.getByTestId('ai-menu-plan-grid')).toContainText('review_needed')
  await expect(page.getByRole('button', { name: /Apply Safe Suggestion/i }).nth(1)).toBeDisabled()
})

test('AI Chef shows Gemini setup when user key is missing', async ({ page }) => {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: false,
        configured: false,
        key_status: 'not_configured',
        key_last4: null,
        last_tested_at: null,
        last_error: null,
      }),
    })
  })
  await login(page)
  await page.goto('/app/ai-chef')
  await expect(page.getByTestId('ai-key-setup-card')).toContainText('Gemini key required')
  await page.getByTestId('ai-go-settings').click()
  await expect(page).toHaveURL(/\/app\/settings/)
})

test('Gemini invalid key state stays secret and guides repair', async ({ page }) => {
  let status = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    is_enabled: false,
    configured: false,
    key_status: 'not_configured',
    key_last4: null,
    last_tested_at: null,
    last_error: null,
  }
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.action === 'test_key') {
      status = {
        ...status,
        key_status: 'invalid',
        key_last4: '9999',
        last_tested_at: new Date().toISOString(),
        last_error: 'Gemini test returned HTTP 403',
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) })
  })
  await login(page)
  await page.goto('/app/settings')
  await page.getByTestId('settings-gemini-key').fill('fake-gemini-key-9999')
  await page.getByTestId('settings-ai-test').click()
  await expect(page.getByTestId('settings-ai-result')).toContainText('Gemini test returned HTTP 403')
  await expect(page.getByText('fake-gemini-key-9999')).toHaveCount(0)
  await page.goto('/app/ai-chef')
  await expect(page.getByTestId('ai-key-invalid-card')).toContainText('Gemini key test failed')
  await expect(page.getByTestId('ai-replace-key')).toBeVisible()
})

test('Gemini valid test requires saving before AI is enabled', async ({ page }) => {
  let status = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    is_enabled: false,
    configured: false,
    key_status: 'not_configured',
    key_last4: null as string | null,
    last_tested_at: null as string | null,
    last_error: null as string | null,
  }
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.action === 'test_key') {
      status = {
        ...status,
        key_status: 'valid',
        key_last4: '7777',
        last_tested_at: new Date().toISOString(),
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...status, message: 'Key valid. Click Save to enable.' }),
      })
      return
    }
    if (body.action === 'save_key') {
      status = {
        ...status,
        is_enabled: true,
        configured: true,
        key_status: 'valid',
        key_last4: '7777',
        last_tested_at: new Date().toISOString(),
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) })
  })
  await login(page)
  await page.goto('/app/settings')
  await page.getByTestId('settings-gemini-key').fill('valid-test-key-7777')
  await page.getByTestId('settings-ai-test').click()
  await expect(page.getByTestId('settings-ai-result')).toContainText('Key valid. Click Save to enable.')
  await expect(page.getByTestId('settings-key-valid-cta')).toContainText('Save key to enable AI')
  await expect(page.getByText('valid-test-key-7777')).toHaveCount(0)
  await page.getByTestId('settings-ai-save-tested-key').click()
  await expect(page.getByText('**** 7777')).toBeVisible()
  await expect(page.getByText('Yes').first()).toBeVisible()
})

test('Gemini quota limit explains HTTP 429 without exposing the key', async ({ page }) => {
  let status = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    is_enabled: false,
    configured: false,
    key_status: 'not_configured',
    key_last4: null as string | null,
    last_tested_at: null as string | null,
    last_error: null as string | null,
  }
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.action === 'save_key') {
      status = {
        ...status,
        key_status: 'rate_limited',
        key_last4: '4290',
        last_tested_at: new Date().toISOString(),
        retry_after_seconds: 120,
        last_error: 'Gemini quota or rate limit was reached for gemini-2.5-flash (HTTP 429). Wait a few minutes and test again.',
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) })
  })
  await login(page)
  await page.goto('/app/settings')
  await page.getByTestId('settings-gemini-key').fill('fake-gemini-key-4290')
  await page.getByTestId('settings-ai-save-key').click()
  await expect(page.getByTestId('settings-ai-result')).toContainText('HTTP 429')
  await expect(page.getByTestId('settings-gemini-quota-help')).toContainText('Gemini quota or rate limit reached')
  await expect(page.getByTestId('settings-gemini-retry-after')).toContainText('120s')
  await expect(page.getByText('fake-gemini-key-4290')).toHaveCount(0)
  await expect(page.getByText('**** 4290')).toBeVisible()
})

test('AI Chef explains Gemini rate limit as retryable review state', async ({ page }) => {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: true,
        configured: false,
        key_status: 'rate_limited',
        key_last4: '4290',
        last_tested_at: new Date().toISOString(),
        last_rate_limited_at: new Date().toISOString(),
        retry_after_seconds: 90,
        last_error: 'Gemini quota or rate limit was reached for gemini-2.5-flash (HTTP 429).',
      }),
    })
  })
  await page.route('**/functions/v1/ai-chef', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: false,
        code: 'gemini_rate_limited',
        message: 'Gemini quota or rate limit was reached for gemini-2.5-flash (HTTP 429).',
        suggested_action: 'Wait for quota to reset or switch model in Settings.',
        validation_summary: { status: 'review_needed', reasons: ['Gemini quota reached.'], warnings: ['Retry after 90 seconds.'] },
        suggestions: [],
      }),
    })
  })
  await login(page)
  await page.goto('/app/ai-chef')
  await expect(page.getByTestId('ai-key-rate-limited-card')).toContainText('Gemini quota is temporarily limited')
  await page.getByTestId('ai-action-weeklyMenu').click()
  await expect(page.getByTestId('ai-rate-limited-result')).toContainText('HTTP 429')
})

test('AI Chef repair menu draft keeps safe slots locked', async ({ page }) => {
  await mockAiKeyConfigured(page)
  await page.route('**/functions/v1/ai-chef', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        action: body.action || 'repair_menu_plan',
        menu_plan: {
          title: 'Repaired menu draft',
          start_date: '2026-05-25',
          end_date: '2026-05-25',
          days: [
            {
              date: '2026-05-25',
              meals: [
                { meal_time: 'breakfast', recipe_name: 'Existing Safe Breakfast', status: 'safe', warnings: [] },
                { meal_time: 'dinner', recipe_name: 'Safe Rice Bowl Repair', status: 'safe', warnings: [] },
              ],
            },
          ],
        },
        suggestions: [
          { title: 'Existing Safe Breakfast', safety_status: 'safe', usable: true, rotation_status: 'allowed', nutrition_status: 'available' },
          { title: 'Safe Rice Bowl Repair', safety_status: 'safe', usable: true, rotation_status: 'allowed', nutrition_status: 'available' },
        ],
        validation_summary: { status: 'safe', reasons: ['1 problematic slots repaired.', '1 safe slots preserved unchanged.'], warnings: [] },
        repair_summary: { repaired_slots: 1, preserved_safe_slots: 1, safe_slots_were_locked: true },
      }),
    })
  })
  await login(page)
  await page.goto('/app/ai-chef')
  await page.getByTestId('ai-action-repairMenuPlan').click()
  await expect(page.getByTestId('ai-menu-plan-grid')).toContainText('Existing Safe Breakfast')
  await expect(page.getByTestId('ai-menu-plan-grid')).toContainText('Safe Rice Bowl Repair')
  await expect(page.getByTestId('ai-inventory-validation')).toContainText('1 safe slots preserved unchanged.')
})

test('Gemini key delete returns AI Chef to setup state', async ({ page }) => {
  let status = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    is_enabled: true,
    configured: true,
    key_status: 'valid',
    key_last4: '1234',
    last_tested_at: new Date().toISOString(),
    last_error: null,
  }
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.action === 'delete_key') {
      status = {
        ...status,
        is_enabled: false,
        configured: false,
        key_status: 'deleted',
        key_last4: null,
        last_tested_at: new Date().toISOString(),
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) })
  })
  await login(page)
  await page.goto('/app/settings')
  await page.getByTestId('settings-ai-delete-key').click()
  await expect(page.getByTestId('settings-ai-result')).toContainText('Gemini key deleted.')
  await page.goto('/app/ai-chef')
  await expect(page.getByTestId('ai-key-setup-card')).toContainText('Gemini key required')
})

test('print reports expose professional chef sheet sections', async ({ page }) => {
  await login(page)
  await page.goto('/app/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  const printLayout = page.getByTestId('reports-print-layout')
  await expect(printLayout).toContainText('Chef Production Sheet')
  await expect(printLayout).toContainText('Weekly Family Menu')
  await expect(printLayout).toContainText('Allergy Report')
  await expect(printLayout).toContainText('Pantry Low Stock Report')
  await expect(printLayout).toContainText('Generated At')
  await expect(page.getByText(/Ground turkey|Rice|Tomato sauce/i).first()).toBeVisible()
  await expect(printLayout).toContainText('Missing')
})

test('exports chef production sheet from reports', async ({ page }) => {
  await login(page)
  await page.goto('/app/reports')
  await page.getByTestId('reports-type').selectOption('productionSheet')
  await page.getByTestId('reports-export-preview').click()
  await expect(page.getByRole('heading', { name: 'Export Preview' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  const excel = await downloadAndInspect(page, 'reports-export-excel', /\.xlsx$/)
  expect(excel.filename.toLowerCase()).toContain('production')
  await expect(page.getByTestId('reports-export-status')).toContainText('Excel export generated.')
  await page.getByTestId('reports-export-pdf').click()
  await expect(page.getByTestId('reports-export-status')).toContainText('PDF export is ready')
})

test('pantry stock subtracts from generated shopping list', async ({ page }) => {
  const stockedIngredientName = 'Rice'
  const stockedRecipeName = 'Beef Rice Bowl with Vegetables'
  await createRemoteMenuItemForFamily(familyName, stockedRecipeName, isoDaysFromNow(300), 'lunch')
  await login(page)
  await page.reload()
  await expect(page.getByTestId('app-data-loading')).toHaveCount(0)
  await page.goto('/app/pantry')
  await page.getByTestId('create-pantry-item').click()
  const pantryForm = page.getByTestId('pantry-form')
  await pantryForm.getByLabel('Family').selectOption({ label: familyName })
  await pantryForm.getByLabel('Ingredient').selectOption({ label: stockedIngredientName })
  await pantryForm.getByLabel('Available').fill('50')
  await pantryForm.getByLabel('Minimum Stock Alert').fill('25')
  await pantryForm.getByLabel('Location').fill('Dry storage')
  await pantryForm.getByRole('button', { name: /^Save$/i }).click()
  await waitForRemoteRow('pantry_inventory', 'location', 'Dry storage')

  await page.goto('/app/shopping-list')
  await page.getByTestId('shopping-family').selectOption({ label: familyName })
  await page.getByRole('button', { name: /Generate from Menu Plan/i }).click()
  await expect(page.getByText(stockedIngredientName).first()).toBeVisible()
  await expect(page.getByText('50 g').first()).toBeVisible()
  await expect(page.getByText('Missing').first()).toBeVisible()
  await expect(page.getByText('Pantry Comparison')).toBeVisible()
  const csvDownload = page.waitForEvent('download')
  await page.getByTestId('shopping-export-csv').click()
  const csv = await inspectDownload(await csvDownload, /\.csv$/)
  expect(csv.filename.toLowerCase()).toContain('shopping')
  expect(csv.content).toContain('Ingredient')
  expect(csv.content).toContain('Missing')
  await expect(page.getByTestId('shopping-export-status')).toContainText('CSV export generated.')
})

test('exports missing ingredients and pantry low stock artifacts', async ({ page }) => {
  await login(page)
  await page.goto('/app/reports')
  await page.getByTestId('reports-family').selectOption({ label: familyName })

  await page.getByTestId('reports-type').selectOption('missingIngredients')
  const missingCsv = await downloadAndInspect(page, 'reports-export-csv', /\.csv$/)
  expect(missingCsv.filename.toLowerCase()).toContain('missing')
  expect(missingCsv.content).toContain('Ingredient')
  expect(missingCsv.content).toContain('Missing')

  await page.getByTestId('reports-type').selectOption('pantryLow')
  const pantryExcel = await downloadAndInspect(page, 'reports-export-excel', /\.xlsx$/)
  expect(pantryExcel.filename.toLowerCase()).toContain('pantry')
})

test('inventory forecast panels show purchase priority and expiration signals', async ({ page }) => {
  await login(page)
  await page.goto('/app/pantry')
  await page.getByTestId('pantry-family').selectOption({ label: familyName })
  await expect(page.getByTestId('inventory-forecast-panel')).toBeVisible()
  await expect(page.getByTestId('purchase-priority-panel')).toBeVisible()
  await expect(page.getByTestId('expiration-forecast-panel')).toBeVisible()
})

test('freezer inventory links prepared meals to reports', async ({ page }) => {
  await login(page)
  await page.goto('/app/freezer')
  await page.getByTestId('freezer-family').selectOption({ label: familyName })
  await page.getByTestId('create-freezer-item').click()
  const freezerForm = page.getByTestId('freezer-form')
  await freezerForm.getByLabel('Family').selectOption({ label: familyName })
  await freezerForm.getByLabel('Recipe').selectOption({ label: recipeName })
  await freezerForm.getByLabel('Prepared Date').fill(isoDaysFromNow(1))
  await freezerForm.getByLabel('Expiration Date').fill(isoDaysFromNow(30))
  await freezerForm.getByLabel('Portions Available').fill('3')
  await freezerForm.getByLabel('Grams per Portion').fill('300')
  await freezerForm.getByLabel('Reheating Instructions').fill('Reheat gently.')
  await freezerForm.getByRole('button', { name: /^Save$/i }).click()
  await waitForRemoteRow('freezer_inventory', 'reheating_instructions', 'Reheat gently.')
  await expect(page.getByText(recipeName).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to Menu/i }).first()).toBeVisible()

  await page.goto('/app/reports')
  await page.getByTestId('reports-family').selectOption({ label: familyName })
  await page.getByTestId('reports-type').selectOption('freezerReport')
  await expect(page.getByText('Freezer Report').first()).toBeVisible()
  await expect(page.getByText(recipeName).first()).toBeVisible()
  await expect(page.getByText('Reheat gently.').first()).toBeVisible()
  const freezerExcel = await downloadAndInspect(page, 'reports-export-excel', /\.xlsx$/)
  expect(freezerExcel.filename.toLowerCase()).toContain('freezer')
})

test('AI Chef inventory-aware action returns structured validation', async ({ page }) => {
  await mockAiKeyConfigured(page)
  await page.route('**/functions/v1/ai-chef', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        action: 'optimize_freezer_usage',
        suggestions: [
          {
            title: 'Freezer-first turkey bowl',
            ingredients: ['rice', 'ground turkey'],
            safety_status: 'safe',
            nutrition_status: 'available',
            rotation_status: 'allowed',
            inventory_status: 'freezer_first',
            usable: true,
          },
        ],
        validation_summary: {
          status: 'safe',
          reasons: ['Inventory forecast validated server-side.'],
          warnings: [],
        },
        missing_ingredients: [{ ingredient: 'Rice', missing_quantity_g: 100, priority: 'high' }],
        expiring_items: [{ type: 'freezer', recipe: 'Turkey Bowl', expiration_date: isoDaysFromNow(2) }],
        freezer_first_candidates: [{ recipe: 'Turkey Bowl', portions_available: 2 }],
        purchase_priority: [{ ingredient: 'Rice', priority: 'high', missing_quantity_g: 100 }],
      }),
    })
  })
  await login(page)
  await page.goto('/app/ai-chef')
  await page.getByTestId('ai-action-freezerFirst').click()
  await expect(page.getByRole('heading', { name: 'Freezer-first turkey bowl' })).toBeVisible()
  await expect(page.getByText('freezer_first').first()).toBeVisible()
  await expect(page.getByTestId('ai-inventory-validation')).toContainText('Inventory Forecast')
  await expect(page.getByTestId('ai-inventory-validation')).toContainText('Missing Ingredients')
  await expect(page.getByTestId('ai-inventory-validation')).toContainText('Freezer-First Candidates')
})

test('alerts can be filtered and resolved from the operations queue', async ({ page }) => {
  await login(page)
  await page.goto('/app/alerts')
  await expect(page.getByText('Operational Alert Queue')).toBeVisible()
  await page.getByTestId('alerts-severity').selectOption('warning')
  await expect(page.getByText('Warning').first()).toBeVisible()
  const readButtons = page.getByTestId('mark-alert-read')
  if (await readButtons.count()) {
    await readButtons.first().click()
    await page.getByTestId('alerts-read-status').selectOption('read')
    await expect(page.getByText('Read').first()).toBeVisible()
  }
})

test('settings exposes AI and security status without secrets', async ({ page }) => {
  await login(page)
  await page.goto('/app/settings')
  await expect(page.getByRole('heading', { name: 'AI Configuration' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Secure Configuration Status' })).toBeVisible()
  await expect(page.getByTestId('runtime-health-panel')).toBeVisible()
  await expect(page.getByTestId('runtime-health-panel')).toContainText('App Environment')
  await expect(page.getByTestId('runtime-health-panel')).toContainText('Supabase Host')
  await expect(page.getByTestId('runtime-health-panel')).toContainText('Production Safeguards')
  await expect(page.getByTestId('runtime-health-panel')).toContainText('Current Role')
  await expect(page.getByText('Frontend uses publishable Supabase keys only.')).toBeVisible()
  await expect(page.getByText('Secrets are not displayed in the application.')).toBeVisible()
  await page.getByTestId('settings-gemini-key').fill('invalid-test-key-1234')
  await page.getByTestId('settings-ai-test').click()
  await expect(page.getByTestId('settings-ai-result')).toContainText(/Gemini test returned HTTP 400|Gemini rejected the request|AI backend is not configured yet|Unable to reach the AI backend|AI backend connection failed/i)
  await expect(page.getByText('invalid-test-key-1234')).toHaveCount(0)
  await page.getByTestId('runtime-health-check').click()
  await expect(page.getByTestId('runtime-health-panel')).toContainText(/Healthy|Needs attention|Not checked/)
  await expect(page.getByText(/service_role|AIza|sbp_/i)).toHaveCount(0)
})

test('runtime health panel exposes deployment metadata safely', async ({ page }) => {
  await login(page)
  await page.goto('/app/settings')
  const panel = page.getByTestId('runtime-health-panel')
  await expect(panel).toContainText('App Environment')
  await expect(panel).toContainText('App Version')
  await expect(panel).toContainText('Supabase Host')
  await expect(panel).toContainText('AI Chef Edge Function')
  await expect(panel).toContainText('Production Safeguards')
  await expect(page.getByText(/service_role|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|AIza|sbp_|eyJ/i)).toHaveCount(0)
})

test('bilingual app shell persists Spanish and supports a Spanish CRUD flow', async ({ page }) => {
  await login(page)
  await page.locator('select').last().selectOption('es')
  await expect(page.getByText('Panel de Operaciones de Cocina')).toBeVisible()
  await page.goto('/app/ingredients')
  await page.getByTestId('create-ingredient').click()
  const ingredientForm = page.getByTestId('ingredient-form')
  await ingredientForm.getByLabel('Nombre').fill(spanishIngredientName)
  await ingredientForm.getByTestId('food-category-search').fill('proteína')
  await ingredientForm.getByTestId('food-category-option-proteins').click()
  await ingredientForm.getByRole('button', { name: /^Guardar$/i }).click()
  await waitForRemoteRow('ingredients', 'name', spanishIngredientName)
  await page.getByTestId('ingredient-search').fill(spanishIngredientName)
  await expect(page.getByText(spanishIngredientName).first()).toBeVisible()
  await page.reload()
  await page.goto('/app/dashboard')
  await expect(page.getByText('Panel de Operaciones de Cocina')).toBeVisible()
  await expect(page.getByText('Familias').first()).toBeVisible()
})

test('global AI Copilot opens from AppShell with setup guidance', async ({ page }) => {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: false,
        configured: false,
        key_status: 'not_configured',
        key_last4: null,
        last_tested_at: null,
        last_error: null,
      }),
    })
  })
  await login(page)
  await page.locator('select').last().selectOption('en')
  await page.getByTestId('app-shell-ai-copilot').click()
  await expect(page.getByTestId('ai-copilot-drawer')).toBeVisible()
  await expect(page.getByTestId('ai-copilot-status')).toContainText('Setup needed')
  await expect(page.getByTestId('ai-copilot-go-settings')).toBeVisible()
})

test('rate-limited Copilot blocks repeated AI actions', async ({ page }) => {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: true,
        configured: false,
        key_status: 'rate_limited',
        key_last4: '4242',
        last_tested_at: new Date().toISOString(),
        last_error: 'Gemini quota or rate limit was reached.',
        retry_after_seconds: 120,
      }),
    })
  })
  await login(page)
  await page.locator('select').last().selectOption('en')
  await page.getByTestId('app-shell-ai-copilot').click()
  await expect(page.getByTestId('ai-copilot-drawer')).toBeVisible()
  await expect(page.getByTestId('ai-copilot-status')).toContainText('Rate limited')
  await expect(page.getByTestId('ai-copilot-retry-after')).toContainText('120')
  await expect(page.getByTestId('ai-copilot-action-dashboard-summarizeRisks')).toBeDisabled()
})

test('Recipes page contextual Copilot sends recipe context and blocks generic apply', async ({ page }) => {
  await mockAiKeyConfigured(page)
  let sawRecipeContext = false
  await page.route('**/functions/v1/ai-chef', async (route) => {
    const request = route.request().postDataJSON() as { page_context?: { page_id?: string }; action?: string }
    sawRecipeContext = request.page_context?.page_id === 'recipes' && request.action === 'contextual_suggestion'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'review_needed',
        page_id: 'recipes',
        action: 'contextual_suggestion',
        title: 'Recipe review',
        summary: 'Review before applying.',
        suggestions: [{
          id: 'generic-recipe-suggestion',
          type: 'recipe',
          title: 'Improve recipe instructions',
          reason: 'Generic copy improvement needs structured recipe payload.',
          status: 'review_needed',
          safety_status: 'review_needed',
          confidence: 0.6,
          warnings: ['Missing structured recipe payload.'],
          data: {},
          apply_option: 'apply_recipe_patch',
        }],
        validation_summary: { status: 'review_needed', reasons: ['Validated server-side.'], warnings: [] },
        apply_options: ['no_apply_available'],
      }),
    })
  })
  await login(page)
  await page.locator('select').last().selectOption('en')
  await page.goto('/app/recipes')
  await page.getByTestId('recipes-ai-improve').click()
  await expect(page.getByTestId('ai-copilot-result')).toBeVisible()
  await expect(page.getByTestId('ai-copilot-suggestion-card')).toContainText('Improve recipe instructions')
  await expect(page.getByTestId('ai-copilot-apply')).toBeDisabled()
  expect(sawRecipeContext).toBe(true)
})

test('/app/ai-chef guided tabs render action templates', async ({ page }) => {
  await mockAiKeyConfigured(page)
  await login(page)
  await page.locator('select').last().selectOption('en')
  await page.goto('/app/ai-chef')
  await expect(page.getByTestId('ai-workspace-tabs')).toBeVisible()
  await page.getByTestId('ai-tab-inventory').click()
  await expect(page.getByTestId('ai-template-action-freezerFirst')).toBeVisible()
  await page.getByTestId('ai-tab-recipe').click()
  await expect(page.getByTestId('ai-template-action-safeRecipe')).toBeVisible()
})

test('Spanish Copilot labels render correctly', async ({ page }) => {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: false,
        configured: false,
        key_status: 'not_configured',
        key_last4: null,
        last_tested_at: null,
        last_error: null,
      }),
    })
  })
  await login(page)
  await page.locator('select').last().selectOption('es')
  await page.getByTestId('app-shell-ai-copilot').click()
  await expect(page.getByTestId('ai-copilot-drawer')).toContainText('Copiloto IA')
  await expect(page.getByTestId('ai-copilot-go-settings')).toContainText('Ir a Ajustes')
})

async function login(page: Page, user = qaUser) {
  await page.goto('/login')
  await page.getByTestId('auth-email').fill(user.email)
  await page.getByTestId('auth-password').fill(user.password)
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.getByTestId('family-selector')).toBeVisible()
  await expect(page.getByTestId('app-data-loading')).toHaveCount(0)
}

async function mockAiKeyConfigured(page: Page) {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        is_enabled: true,
        configured: true,
        key_status: 'valid',
        key_last4: '1234',
        last_tested_at: new Date().toISOString(),
        last_error: null,
      }),
    })
  })
}

async function downloadAndInspect(page: Page, testId: string, extension: RegExp) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId(testId).click()
  return inspectDownload(await downloadPromise, extension)
}

async function inspectDownload(download: Download, extension: RegExp) {
  const filename = download.suggestedFilename()
  expect(filename).toMatch(extension)
  const filePath = await download.path()
  expect(filePath).toBeTruthy()
  expect(statSync(filePath!).size).toBeGreaterThan(0)
  return {
    filename,
    content: filename.endsWith('.csv') ? readFileSync(filePath!, 'utf8') : '',
  }
}

async function ensureQaUser({ email, fullName, role }: { email: string; fullName: string; role: 'chef' | 'viewer' }): Promise<QaUser> {
  const password = `SfmE2e${randomUUID()}!1a`
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  expect(listed.error).toBeFalsy()
  let user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === email)
  if (user) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { full_name: fullName },
    })
    expect(updated.error).toBeFalsy()
    user = updated.data.user
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    expect(created.error).toBeFalsy()
    user = created.data.user
  }
  const profile = await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    role,
    preferred_language: 'en',
  }).select('id').single()
  expect(profile.error).toBeFalsy()
  return { id: user.id, email, password }
}

async function assignViewerToSeedFamily() {
  const familyId = await galeanoFamilyId()
  const membership = await admin.from('family_users').upsert({
    family_id: familyId,
    profile_id: viewerUser.id,
    role: 'viewer',
  }, { onConflict: 'family_id,profile_id' })
  expect(membership.error).toBeFalsy()
}

async function galeanoFamilyId() {
  const family = await admin
    .from('families')
    .select('id')
    .eq('owner_id', qaUser.id)
    .eq('name', 'Galeano Family')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  expect(family.error).toBeFalsy()
  return family.data.id as string
}

async function galeanoDinerId(namePrefix: string) {
  const diner = await admin
    .from('family_members')
    .select('id')
    .eq('family_id', await galeanoFamilyId())
    .ilike('full_name', `${namePrefix}%`)
    .limit(1)
    .single()
  expect(diner.error).toBeFalsy()
  return diner.data.id as string
}

async function seedDemoWorkspace(user: QaUser) {
  const client = createClient(requiredEnv('VITE_SUPABASE_URL'), requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const auth = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  expect(auth.error).toBeFalsy()
  const seed = await client.rpc('seed_demo_workspace')
  expect(seed.error).toBeFalsy()
  await client.auth.signOut()
}

async function cleanupE2eData() {
  const families = await admin.from('families').select('id').ilike('name', 'SFM E2E%')
  if (families.data?.length) {
    await admin.from('families').delete().in('id', families.data.map((family) => family.id))
  }
  const recipes = await admin.from('recipes').select('id').ilike('name', 'SFM E2E%')
  if (recipes.data?.length) {
    await admin.from('recipe_ingredients').delete().in('recipe_id', recipes.data.map((recipe) => recipe.id))
    await admin.from('menu_plan_items').delete().in('recipe_id', recipes.data.map((recipe) => recipe.id))
    await admin.from('recipes').delete().in('id', recipes.data.map((recipe) => recipe.id))
  }
  await admin.from('ingredients').delete().ilike('name', 'SFM E2E%')
}

async function waitForRemoteRow(table: string, column: string, value: string) {
  await expect.poll(async () => {
    const result = await admin.from(table).select('id', { count: 'exact', head: true }).eq(column, value)
    return result.count || 0
  }, { timeout: 15_000 }).toBeGreaterThan(0)
}

async function waitForRecipeIngredients(recipeName: string) {
  await expect.poll(async () => {
    const recipe = await admin.from('recipes').select('id').eq('name', recipeName).maybeSingle()
    if (!recipe.data?.id) return 0
    const ingredients = await admin.from('recipe_ingredients').select('id', { count: 'exact', head: true }).eq('recipe_id', recipe.data.id)
    return ingredients.count || 0
  }, { timeout: 15_000 }).toBeGreaterThan(0)
}

async function waitForRecipeImage(recipeName: string, imageUrl: string) {
  await expect.poll(async () => {
    const recipe = await admin.from('recipes').select('image_url').eq('name', recipeName).maybeSingle()
    return recipe.data?.image_url || ''
  }, { timeout: 15_000 }).toBe(imageUrl)
}

async function createRemoteMenuItemForFamily(familyNameValue: string, recipeNameValue: string, plannedDate: string, mealTime: string) {
  const family = await admin.from('families').select('id').eq('name', familyNameValue).limit(1).single()
  expect(family.error).toBeFalsy()
  const recipe = await admin.from('recipes').select('id').eq('owner_id', qaUser.id).eq('name', recipeNameValue).limit(1).single()
  expect(recipe.error).toBeFalsy()
  const plan = await admin.from('menu_plans').insert({
    family_id: family.data.id,
    name: `${e2ePrefix} Inventory Forecast Menu`,
    start_date: plannedDate,
    end_date: plannedDate,
    status: 'planned',
    created_by: qaUser.id,
  }).select('id').single()
  expect(plan.error).toBeFalsy()
  const item = await admin.from('menu_plan_items').insert({
    menu_plan_id: plan.data.id,
    recipe_id: recipe.data.id,
    planned_date: plannedDate,
    meal_time: mealTime,
    servings: 1,
    portion_factor: 1,
    allergy_status: 'safe',
    variety_status: 'allowed',
  })
  expect(item.error).toBeFalsy()
}

function adminClient() {
  return createClient(requiredEnv('VITE_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function isoDaysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function loadEnv(path: string) {
  if (!existsSync(path)) return
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim()
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}


