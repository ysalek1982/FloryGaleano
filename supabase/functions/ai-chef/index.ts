import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supportedActions = new Set([
  'generate_week_menu',
  'generate_day_menu',
  'create_recipe',
  'suggest_substitutions',
  'review_school_menu',
  'generate_shopping_list',
  'optimize_freezer_usage',
  'calculate_menu_improvements',
  'pantry_aware_meals',
  'freezer_first_meals',
  'reduce_waste_menu',
  'purchase_priority',
  'explain_missing_items',
  'ping',
])

const inventoryAwareActions = new Set([
  'generate_shopping_list',
  'optimize_freezer_usage',
  'calculate_menu_improvements',
  'pantry_aware_meals',
  'freezer_first_meals',
  'reduce_waste_menu',
  'purchase_priority',
  'explain_missing_items',
])

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const body = await req.json()
    const action = normalizeAction(body?.action)
    if (!supportedActions.has(action)) {
      return json({ error: 'Unsupported AI Chef action.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const model = body?.model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

    if (action === 'ping') {
      return json({
        configured: Boolean(supabaseUrl && serviceRoleKey && geminiApiKey),
        gemini_configured: Boolean(geminiApiKey),
        service_role_configured: Boolean(serviceRoleKey),
        model,
      })
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase service configuration is missing.' }, 500)
    }

    const authorization = req.headers.get('Authorization') || ''
    const token = authorization.replace('Bearer ', '')
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401)

    const context = await loadFamilyContext(admin, userData.user.id, body?.family_id)
    if (!context.family) return json({ error: 'No accessible family context found.' }, 404)
    const inventoryForecast = calculateInventoryForecast(context)

    if (!geminiApiKey) {
      return json({
        configured: false,
        model,
        action,
        context_summary: summarizeContext(context),
        inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: ['Gemini is not configured in Supabase secrets.'],
          warnings: [],
        },
        missing_ingredients: inventoryForecast.missing_ingredients,
        expiring_items: inventoryForecast.expiring_items,
        freezer_first_candidates: inventoryForecast.freezer_first_candidates,
        purchase_priority: inventoryForecast.purchase_priority,
        safety: {
          status: 'review_needed',
          reason: 'Gemini is not configured in Supabase secrets.',
        },
      })
    }

    const systemPrompt = [
      'You are Smart Family Meals AI Chef.',
      'Return only valid JSON matching the requested schema.',
      'Never override allergy, trace, nutrition, or menu rotation safety rules.',
      'Use safe/review_needed/blocked statuses for every suggestion.',
      'If an ingredient is ambiguous, mark the suggestion review_needed.',
      'Use the requested language for user-facing explanations.',
    ].join('\n')

    const userPrompt = JSON.stringify({
      action,
      prompt: body?.prompt || '',
      language: body?.language || context.profile?.preferred_language || 'en',
      context: {
        ...context,
        inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
      },
      required_shape: {
        suggestions: [
          {
            title: 'string',
            recipe_id: 'uuid | null',
            planned_date: 'YYYY-MM-DD | null',
            meal_time: 'breakfast | school_lunch | lunch | snack | sport_snack | dinner | evening_snack | null',
            ingredients: ['string'],
            nutrition: {
              calories: 'number | null',
              protein_g: 'number | null',
            },
            safety_status: 'safe | review_needed | blocked',
            safety_notes: ['string'],
            confidence: 'number 0-1',
          },
        ],
        validation_summary: {
          status: 'safe | review_needed | blocked',
          reasons: ['string'],
          warnings: ['string'],
        },
        missing_ingredients: [
          {
            ingredient: 'string',
            missing_quantity_g: 'number',
            priority: 'critical | high | medium | low',
            reason: 'string',
          },
        ],
        expiring_items: ['string'],
        freezer_first_candidates: ['string'],
        purchase_priority: ['string'],
        shopping_list: [
          {
            ingredient: 'string',
            required_quantity_g: 'number',
            reason: 'string',
          },
        ],
      },
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.35,
          },
        }),
      },
    )

    if (!response.ok) {
      return json(fallbackAiResponse({
        configured: true,
        model,
        action,
        context,
        inventoryForecast,
        reason: 'Gemini request failed.',
      }))
    }

    const gemini = await response.json()
    const text = gemini?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      return json(fallbackAiResponse({
        configured: true,
        model,
        action,
        context,
        inventoryForecast,
        reason: 'Gemini returned invalid JSON.',
      }))
    }
    const validated = validateAiOutput(parsed, context, inventoryForecast, action)
    await createAiAlerts(admin, context, validated.suggestions)
    return json({
      configured: true,
      model,
      action,
      context_summary: summarizeContext(context),
      inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
      ...validated,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

async function loadFamilyContext(admin: ReturnType<typeof createClient>, userId: string, requestedFamilyId?: string) {
  const [{ data: profile }, { data: ownedFamilies }, { data: memberships }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, preferred_language').eq('id', userId).maybeSingle(),
    admin.from('families').select('*').or(`owner_id.eq.${userId},chef_id.eq.${userId}`),
    admin.from('family_users').select('family_id, role').eq('profile_id', userId),
  ])

  const accessibleIds = new Set<string>((ownedFamilies || []).map((family: { id: string }) => family.id))
  for (const membership of memberships || []) accessibleIds.add(membership.family_id)
  const familyId = requestedFamilyId && accessibleIds.has(requestedFamilyId)
    ? requestedFamilyId
    : Array.from(accessibleIds)[0]

  if (!familyId) return { profile, family: null }

  const [
    { data: family },
    { data: diners },
    { data: ingredients },
    { data: recipes },
    { data: recipeIngredients },
    { data: pantry },
    { data: freezer },
    { data: menuPlans },
  ] = await Promise.all([
    admin.from('families').select('*').eq('id', familyId).maybeSingle(),
    admin.from('family_members').select('*, allergies(*), dietary_restrictions(*), food_preferences(*)').eq('family_id', familyId),
    admin.from('ingredients').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('recipes').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('recipe_ingredients').select('*'),
    admin.from('pantry_inventory').select('*').eq('family_id', familyId),
    admin.from('freezer_inventory').select('*').eq('family_id', familyId),
    admin.from('menu_plans').select('*, menu_plan_items(*)').eq('family_id', familyId),
  ])

  return {
    profile,
    family,
    diners: diners || [],
    allergies: (diners || []).flatMap((diner: { allergies?: unknown[] }) => diner.allergies || []),
    ingredients: ingredients || [],
    recipes: recipes || [],
    recipe_ingredients: recipeIngredients || [],
    pantry: pantry || [],
    freezer: freezer || [],
    menu_history: (menuPlans || []).flatMap((plan: { menu_plan_items?: unknown[] }) => plan.menu_plan_items || []),
  }
}

function normalizeAction(action: string | undefined) {
  const map: Record<string, string> = {
    weeklyMenu: 'generate_week_menu',
    dailyMenu: 'generate_day_menu',
    safeRecipe: 'create_recipe',
    substitutions: 'suggest_substitutions',
    schoolMenu: 'review_school_menu',
    shoppingList: 'generate_shopping_list',
    freezerUsage: 'optimize_freezer_usage',
    freezerFirst: 'freezer_first_meals',
    pantryMeals: 'pantry_aware_meals',
    wasteReduction: 'reduce_waste_menu',
    purchasePriority: 'purchase_priority',
    explainMissing: 'explain_missing_items',
    variety: 'calculate_menu_improvements',
    completeSlots: 'generate_week_menu',
    translate: 'create_recipe',
    productionPlan: 'calculate_menu_improvements',
  }
  return map[action || ''] || action || 'generate_week_menu'
}

function validateAiOutput(
  output: Record<string, unknown>,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  action: string,
) {
  const allergies = Array.isArray(context.allergies) ? context.allergies as Array<Record<string, unknown>> : []
  const menuHistory = Array.isArray(context.menu_history) ? context.menu_history as Array<Record<string, unknown>> : []
  const blockedTerms = allergies
    .flatMap((allergy) => [allergy.allergen_name, allergy.normalized_allergen_name])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
  const suggestions = Array.isArray(output.suggestions) ? output.suggestions as Array<Record<string, unknown>> : []

  const validatedSuggestions = suggestions.map((suggestion) => {
    const ingredients = Array.isArray(suggestion.ingredients) ? suggestion.ingredients.map(String) : []
    const text = `${suggestion.title || ''} ${ingredients.join(' ')}`.toLowerCase()
    const matched = blockedTerms.filter((term) => term && text.includes(term))
    const rotation = validateRotation(suggestion, menuHistory)
    const nutrition = suggestion.nutrition as Record<string, unknown> | undefined
    const missingNutrition = !nutrition || nutrition.calories == null || nutrition.protein_g == null
    const existingStatus = String(suggestion.safety_status || 'review_needed')
    const inventoryValidation = validateInventorySuggestion(suggestion, inventoryForecast)
    const safetyStatus = matched.length > 0
      ? 'blocked'
      : rotation.status === 'blocked' || missingNutrition || inventoryValidation.status === 'review_needed'
        ? 'review_needed'
        : inventoryValidation.status === 'blocked'
          ? 'blocked'
        : existingStatus
    return {
      ...suggestion,
      safety_status: safetyStatus,
      usable: safetyStatus === 'safe',
      rotation_status: rotation.status,
      nutrition_status: missingNutrition ? 'review_needed' : 'available',
      inventory_status: inventoryValidation.status,
      safety_notes: [
        ...((Array.isArray(suggestion.safety_notes) ? suggestion.safety_notes : []) as string[]),
        ...(matched.length ? [`Blocked terms detected: ${matched.join(', ')}`] : []),
        ...(rotation.note ? [rotation.note] : []),
        ...(missingNutrition ? ['Nutrition data is incomplete.'] : []),
        ...inventoryValidation.notes,
      ],
    }
  })
  const status = validatedSuggestions.some((suggestion) => suggestion.safety_status === 'blocked')
    ? 'blocked'
    : validatedSuggestions.some((suggestion) => suggestion.safety_status === 'review_needed') || inventoryForecast.warnings.length > 0
      ? 'review_needed'
      : 'safe'

  return {
    ...output,
    suggestions: validatedSuggestions,
    usable_suggestions: validatedSuggestions.filter((suggestion) => suggestion.usable),
    validation_summary: {
      status,
      reasons: [
        `Action ${action} validated server-side.`,
        `${inventoryForecast.missing_ingredients.length} missing ingredients detected.`,
        `${inventoryForecast.freezer_first_candidates.length} freezer-first candidates detected.`,
      ],
      warnings: inventoryForecast.warnings,
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
  }
}

function fallbackAiResponse({
  configured,
  model,
  action,
  context,
  inventoryForecast,
  reason,
}: {
  configured: boolean
  model: string
  action: string
  context: Record<string, unknown>
  inventoryForecast: InventoryForecast
  reason: string
}) {
  const fallback = {
    title: 'AI suggestion requires review',
    recipe_id: null,
    planned_date: null,
    meal_time: null,
    ingredients: [],
    nutrition: {
      calories: null,
      protein_g: null,
    },
    safety_status: 'review_needed',
    usable: false,
    rotation_status: 'review_needed',
    nutrition_status: 'review_needed',
    safety_notes: [reason, 'No usable suggestion was returned by the AI provider.'],
    confidence: 0,
  }

  return {
    configured,
    model,
    action,
    context_summary: summarizeContext(context),
    inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
    suggestions: [fallback],
    usable_suggestions: [],
    validation_summary: {
      status: 'review_needed',
      reasons: [reason],
      warnings: inventoryForecast.warnings,
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
    safety: {
      status: 'review_needed',
      reason,
    },
  }
}

function validateRotation(suggestion: Record<string, unknown>, history: Array<Record<string, unknown>>) {
  const recipeId = String(suggestion.recipe_id || '')
  const plannedDate = String(suggestion.planned_date || new Date().toISOString().slice(0, 10))
  if (!recipeId) return { status: 'review_needed', note: 'No recipe_id provided for rotation validation.' }
  const previous = history
    .filter((item) => String(item.recipe_id) === recipeId && String(item.planned_date) < plannedDate)
    .sort((a, b) => String(b.planned_date).localeCompare(String(a.planned_date)))[0]
  if (!previous) return { status: 'allowed', note: '' }
  const days = Math.round((new Date(`${plannedDate}T12:00:00`).getTime() - new Date(`${String(previous.planned_date)}T12:00:00`).getTime()) / 86_400_000)
  if (days >= 21) return { status: 'allowed', note: '' }
  return {
    status: 'blocked',
    note: `Menu rotation review: recipe was served ${days} days ago and should wait ${21 - days} more days.`,
  }
}

interface InventoryForecast {
  missing_ingredients: Array<Record<string, unknown>>
  expiring_items: Array<Record<string, unknown>>
  freezer_first_candidates: Array<Record<string, unknown>>
  purchase_priority: Array<Record<string, unknown>>
  warnings: string[]
}

function calculateInventoryForecast(context: Record<string, unknown>): InventoryForecast {
  const ingredients = arrayRecords(context.ingredients)
  const recipes = arrayRecords(context.recipes)
  const recipeIngredients = arrayRecords(context.recipe_ingredients)
  const pantry = arrayRecords(context.pantry)
  const freezer = arrayRecords(context.freezer)
  const menuItems = arrayRecords(context.menu_history)
  const today = new Date(`${todayIso()}T12:00:00Z`)

  const ingredientById = new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient]))
  const recipeById = new Map(recipes.map((recipe) => [String(recipe.id), recipe]))
  const pantryByIngredient = new Map<string, number>()
  for (const item of pantry) {
    const ingredientId = String(item.ingredient_id || '')
    pantryByIngredient.set(ingredientId, (pantryByIngredient.get(ingredientId) || 0) + Number(item.quantity_available || 0))
  }

  const upcoming = menuItems.filter((item) => {
    const diff = daysBetween(today, String(item.planned_date || ''))
    return diff >= 0 && diff <= 7
  })
  const requiredByIngredient = new Map<string, { quantity: number; earliestDate?: string; recipes: Set<string> }>()
  for (const item of upcoming) {
    const recipe = recipeById.get(String(item.recipe_id || ''))
    if (!recipe) continue
    const servings = Math.max(Number(recipe.servings || 1), 1)
    const itemServings = Math.max(Number(item.servings || 1), 1)
    for (const row of recipeIngredients.filter((candidate) => String(candidate.recipe_id) === String(recipe.id))) {
      const ingredientId = String(row.ingredient_id || '')
      const current = requiredByIngredient.get(ingredientId) || { quantity: 0, recipes: new Set<string>() }
      current.quantity += (Number(row.quantity_g || 0) / servings) * itemServings
      current.earliestDate = [current.earliestDate, String(item.planned_date || '')].filter(Boolean).sort()[0]
      current.recipes.add(String(recipe.name || ''))
      requiredByIngredient.set(ingredientId, current)
    }
  }

  const purchaseRows = Array.from(requiredByIngredient.entries()).map(([ingredientId, required]) => {
    const ingredient = ingredientById.get(ingredientId)
    const available = pantryByIngredient.get(ingredientId) || 0
    const missing = Math.max(0, required.quantity - available)
    const daysUntilNeeded = required.earliestDate ? daysBetween(today, required.earliestDate) : undefined
    const priority = priorityFor(daysUntilNeeded, missing)
    return {
      ingredient_id: ingredientId,
      ingredient: String(ingredient?.name || ingredientId),
      required_quantity_g: Math.round(required.quantity),
      available_quantity_g: Math.round(available),
      missing_quantity_g: Math.round(missing),
      earliest_date: required.earliestDate || null,
      recipes: Array.from(required.recipes),
      priority,
      reason: missing > 0 ? 'missing_for_upcoming_menu' : 'covered_by_pantry',
    }
  })

  const pantryExpiring = pantry
    .filter((item) => isWithinDays(String(item.expiration_date || ''), 7, today))
    .map((item) => ({
      type: 'pantry',
      ingredient: String(ingredientById.get(String(item.ingredient_id || ''))?.name || item.ingredient_id || ''),
      expiration_date: item.expiration_date,
      quantity_available: item.quantity_available,
    }))
  const freezerExpiring = freezer
    .filter((item) => isWithinDays(String(item.expiration_date || ''), 10, today))
    .map((item) => {
      const recipe = recipeById.get(String(item.recipe_id || ''))
      return {
        type: 'freezer',
        recipe_id: item.recipe_id,
        recipe: String(recipe?.name || item.recipe_id || ''),
        expiration_date: item.expiration_date,
        portions_available: item.portions_available,
      }
    })
  const freezerLow = freezer
    .filter((item) => Number(item.portions_available || 0) <= 2)
    .map((item) => {
      const recipe = recipeById.get(String(item.recipe_id || ''))
      return {
        recipe_id: item.recipe_id,
        recipe: String(recipe?.name || item.recipe_id || ''),
        portions_available: item.portions_available,
        reason: 'low_portions',
      }
    })

  const warnings = [
    ...purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0).map((row) => `Missing ${row.missing_quantity_g}g of ${row.ingredient}.`),
    ...freezerExpiring.map((item) => `${item.recipe} freezer item expires soon.`),
  ]

  return {
    missing_ingredients: purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0),
    expiring_items: [...pantryExpiring, ...freezerExpiring],
    freezer_first_candidates: [...freezerExpiring, ...freezerLow],
    purchase_priority: purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0 || row.priority === 'low'),
    warnings,
  }
}

function validateInventorySuggestion(suggestion: Record<string, unknown>, forecast: InventoryForecast) {
  const ingredients = Array.isArray(suggestion.ingredients) ? suggestion.ingredients.map((item) => String(item).toLowerCase()) : []
  const missing = forecast.missing_ingredients.filter((item) => {
    const name = String(item.ingredient || '').toLowerCase()
    return name && ingredients.some((ingredient) => ingredient.includes(name) || name.includes(ingredient))
  })
  if (missing.length > 0) {
    return {
      status: 'review_needed',
      notes: missing.map((item) => `Inventory review: ${item.ingredient} is missing ${item.missing_quantity_g}g.`),
    }
  }
  return { status: 'safe', notes: [] as string[] }
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : []
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(start: Date, endIso: string) {
  if (!endIso) return Number.POSITIVE_INFINITY
  const end = new Date(`${endIso}T12:00:00Z`)
  if (Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function isWithinDays(dateIso: string, days: number, today: Date) {
  const diff = daysBetween(today, dateIso)
  return diff >= 0 && diff <= days
}

function priorityFor(daysUntilNeeded: number | undefined, missingQuantity: number) {
  if (missingQuantity <= 0) return 'low'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 2) return 'critical'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 5) return 'high'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 7) return 'medium'
  return 'low'
}

async function createAiAlerts(
  admin: ReturnType<typeof createClient>,
  context: Record<string, unknown>,
  suggestions: Array<Record<string, unknown>>,
) {
  const family = context.family as { id?: string } | null
  if (!family?.id) return
  const unsafe = suggestions.filter((suggestion) => suggestion.safety_status !== 'safe')
  if (unsafe.length === 0) return
  await admin.from('alerts').insert(unsafe.map((suggestion) => ({
    family_id: family.id,
    type: 'ai_safety_review',
    severity: suggestion.safety_status === 'blocked' ? 'critical' : 'warning',
    title: 'alerts.reviewRecipe',
    message: 'alerts.reviewRecipeMessage',
    related_table: 'recipes',
    related_id: suggestion.recipe_id || null,
  })))
}

function summarizeContext(context: Record<string, unknown>) {
  return {
    family: (context.family as { name?: string } | null)?.name,
    diners: Array.isArray(context.diners) ? context.diners.length : 0,
    allergies: Array.isArray(context.allergies) ? context.allergies.length : 0,
    ingredients: Array.isArray(context.ingredients) ? context.ingredients.length : 0,
    recipes: Array.isArray(context.recipes) ? context.recipes.length : 0,
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
