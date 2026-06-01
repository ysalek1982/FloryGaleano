import { expect, test, type Page } from '@playwright/test'

test.describe('mocked AI Copilot lane', () => {
  test('global Copilot opens with setup guidance without remote QA setup', async ({ page }) => {
    await mockAiKeyStatus(page, aiStatus({ key_status: 'not_configured', configured: false, is_enabled: false }))
    await loginMock(page)

    await page.getByTestId('app-shell-ai-copilot').click()
    await expect(page.getByTestId('ai-copilot-drawer')).toBeVisible()
    await expect(page.getByTestId('ai-copilot-status')).toContainText('Setup needed')
    await expect(page.getByTestId('ai-copilot-go-settings')).toBeVisible()
  })

  test('rate-limited Copilot blocks repeated AI actions', async ({ page }) => {
    await mockAiKeyStatus(page, aiStatus({
      key_status: 'rate_limited',
      configured: false,
      is_enabled: true,
      key_last4: '4242',
      last_error: 'Gemini quota or rate limit was reached.',
      retry_after_seconds: 120,
    }))
    await loginMock(page)

    await page.getByTestId('app-shell-ai-copilot').click()
    await expect(page.getByTestId('ai-copilot-status')).toContainText('Rate limited')
    await expect(page.getByTestId('ai-copilot-retry-after')).toContainText('120')
    await expect(page.getByTestId('ai-copilot-action-dashboard-summarizeRisks')).toBeDisabled()
  })

  test('review-needed apply requires a confirmation reason', async ({ page }) => {
    await mockAiKeyStatus(page, aiStatus({ key_status: 'valid', configured: true, is_enabled: true, key_last4: '1234' }))
    await page.route('**/functions/v1/ai-chef', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'review_needed',
          page_id: 'dashboard',
          action: 'suggest_next_action',
          title: 'Purchase priority',
          summary: 'Review before adding this shopping item.',
          suggestions: [{
            id: 'review-shopping-item',
            type: 'shopping',
            title: 'Add oats to shopping list',
            reason: 'Breakfast plan needs a review because pantry stock is ambiguous.',
            status: 'review_needed',
            confidence: 0.75,
            warnings: ['Confirm brand and allergen traces.'],
            data: { ingredient_id: 'review-ingredient-id', quantity: 250, unit: 'g' },
            apply_option: 'create_shopping_item',
          }],
          validation_summary: { status: 'review_needed', reasons: ['Needs human review.'], warnings: [] },
        }),
      })
    })
    await loginMock(page)

    await page.getByTestId('app-shell-ai-copilot').click()
    await page.getByTestId('ai-copilot-action-dashboard-nextAction').click()
    await expect(page.getByTestId('ai-copilot-suggestion-card')).toContainText('Add oats')
    await page.getByTestId('ai-copilot-apply').click()
    await expect(page.getByTestId('ai-copilot-confirm-apply')).toBeDisabled()
    await page.getByTestId('ai-copilot-review-reason').fill('Chef reviewed allergen risk.')
    await expect(page.getByTestId('ai-copilot-confirm-apply')).toBeEnabled()
  })

  test('Recipes page contextual Copilot sends recipe context and blocks generic apply', async ({ page }) => {
    await mockAiKeyStatus(page, aiStatus({ key_status: 'valid', configured: true, is_enabled: true, key_last4: '1234' }))
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
    await loginMock(page)

    await page.goto('/app/recipes')
    await page.getByTestId('recipes-ai-improve').click()
    await expect(page.getByTestId('ai-copilot-result')).toBeVisible()
    await expect(page.getByTestId('ai-copilot-suggestion-card')).toContainText('Improve recipe instructions')
    await expect(page.getByTestId('ai-copilot-apply')).toBeDisabled()
    expect(sawRecipeContext).toBe(true)
  })

  test('Spanish Copilot labels render correctly', async ({ page }) => {
    await mockAiKeyStatus(page, aiStatus({ key_status: 'not_configured', configured: false, is_enabled: false }))
    await loginMock(page)

    await page.locator('select').last().selectOption('es')
    await page.getByTestId('app-shell-ai-copilot').click()
    await expect(page.getByTestId('ai-copilot-drawer')).toContainText('Copiloto IA')
    await expect(page.getByTestId('ai-copilot-go-settings')).toContainText('Ir a Ajustes')
  })
})

async function loginMock(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await page.getByTestId('auth-email').fill('mocked-copilot@example.com')
  await page.getByTestId('auth-password').fill('not-a-real-password')
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.getByTestId('family-selector')).toBeVisible()
  await expect(page.getByTestId('app-data-loading')).toHaveCount(0)
}

async function mockAiKeyStatus(page: Page, body: Record<string, unknown>) {
  await page.route('**/functions/v1/ai-key-manager', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

function aiStatus(overrides: Record<string, unknown>) {
  return {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    is_enabled: false,
    configured: false,
    key_status: 'not_configured',
    key_last4: null,
    last_tested_at: null,
    last_error: null,
    ...overrides,
  }
}
