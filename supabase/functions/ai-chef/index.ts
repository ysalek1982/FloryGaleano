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
    const platformGeminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const platformFallbackEnabled = Deno.env.get('PLATFORM_GEMINI_FALLBACK_ENABLED') === 'true'
    const model = body?.model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase service configuration is missing.' }, 500)
    }

    const authorization = req.headers.get('Authorization') || ''
    const token = authorization.replace('Bearer ', '')
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)

    if (action === 'ping') {
      const userKey = userData.user ? await loadUserGeminiKey(admin, userData.user.id) : null
      const hasPlatformFallback = platformFallbackEnabled && Boolean(platformGeminiApiKey)
      return json({
        configured: Boolean(supabaseUrl && serviceRoleKey && (userKey?.apiKey || hasPlatformFallback)),
        gemini_configured: Boolean(userKey?.apiKey || hasPlatformFallback),
        service_role_configured: Boolean(serviceRoleKey),
        model: userKey?.model || model,
        ai_provider: 'gemini',
        ai_key_source: userKey?.apiKey ? 'user' : hasPlatformFallback ? 'platform_fallback' : 'not_configured',
        ai_configured: Boolean(userKey?.apiKey || hasPlatformFallback),
        key_last4: userKey?.keyLast4 || null,
        last_tested_at: userKey?.lastTestedAt || null,
      })
    }

    if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401)

    const context = await loadFamilyContext(admin, userData.user.id, body?.family_id)
    if (!context.family) return json({ error: 'No accessible family context found.' }, 404)
    const inventoryForecast = calculateInventoryForecast(context)
    const userKey = await loadUserGeminiKey(admin, userData.user.id)
    const selectedKey = userKey?.apiKey
      ? { apiKey: userKey.apiKey, source: 'user', model: userKey.model || model }
      : platformFallbackEnabled && platformGeminiApiKey
        ? { apiKey: platformGeminiApiKey, source: 'platform_fallback', model }
        : null

    if (!selectedKey) {
      return json({
        configured: false,
        model,
        action,
        ai_provider: 'gemini',
        ai_key_source: 'not_configured',
        ai_configured: false,
        code: 'gemini_key_missing',
        message: 'Gemini API key is not configured.',
        suggested_action: 'Configure your Gemini API key in Settings.',
        context_summary: summarizeContext(context),
        inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: ['Gemini API key is not configured for this user.'],
          warnings: [],
        },
        missing_ingredients: inventoryForecast.missing_ingredients,
        expiring_items: inventoryForecast.expiring_items,
        freezer_first_candidates: inventoryForecast.freezer_first_candidates,
        purchase_priority: inventoryForecast.purchase_priority,
        safety: {
          status: 'review_needed',
          reason: 'Gemini API key is not configured for this user.',
        },
      })
    }

    const systemPrompt = [
      'You are Smart Family Meals AI Chef.',
      'Return only valid JSON matching the requested schema.',
      'Never override allergy, trace, nutrition, or menu rotation safety rules.',
      'Use safe/review_needed/blocked statuses for every suggestion.',
      'If an ingredient is ambiguous, mark the suggestion review_needed.',
      'Use only predefined food category codes from context.food_categories for new ingredients.',
      'If no category fits, use category_code "other" and include a warning.',
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
            category_code: 'predefined food category code | other',
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
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedKey.model}:generateContent?key=${selectedKey.apiKey}`,
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
        model: selectedKey.model,
        action,
        context,
        inventoryForecast,
        reason: 'Gemini request failed.',
        aiKeySource: selectedKey.source,
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
        model: selectedKey.model,
        action,
        context,
        inventoryForecast,
        reason: 'Gemini returned invalid JSON.',
        aiKeySource: selectedKey.source,
      }))
    }
    const validated = validateAiOutput(parsed, context, inventoryForecast, action)
    await createAiAlerts(admin, context, validated.suggestions)
    return json({
      configured: true,
      model: selectedKey.model,
      action,
      ai_provider: 'gemini',
      ai_key_source: selectedKey.source,
      ai_configured: true,
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
    { data: foodCategories },
  ] = await Promise.all([
    admin.from('families').select('*').eq('id', familyId).maybeSingle(),
    admin.from('family_members').select('*, allergies(*), dietary_restrictions(*), food_preferences(*)').eq('family_id', familyId),
    admin.from('ingredients').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('recipes').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('recipe_ingredients').select('*'),
    admin.from('pantry_inventory').select('*').eq('family_id', familyId),
    admin.from('freezer_inventory').select('*').eq('family_id', familyId),
    admin.from('menu_plans').select('*, menu_plan_items(*)').eq('family_id', familyId),
    admin.from('food_categories').select('code, name_en, name_es, aliases_en, aliases_es, usda_category_hints').eq('is_active', true).order('sort_order'),
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
    food_categories: foodCategories || [],
    menu_history: (menuPlans || []).flatMap((plan: { menu_plan_items?: unknown[] }) => plan.menu_plan_items || []),
  }
}

async function loadUserGeminiKey(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('user_ai_settings')
    .select('model, is_enabled, encrypted_key, key_iv, key_last4, key_status, last_tested_at')
    .eq('profile_id', userId)
    .eq('provider', 'gemini')
    .maybeSingle()
  if (error || !data) return null
  if (data.is_enabled !== true || data.key_status !== 'valid' || !data.encrypted_key || !data.key_iv) return null
  try {
    return {
      apiKey: await decryptSecret(String(data.encrypted_key), String(data.key_iv)),
      model: String(data.model || 'gemini-2.5-flash'),
      keyLast4: data.key_last4 ? String(data.key_last4) : null,
      lastTestedAt: data.last_tested_at ? String(data.last_tested_at) : null,
    }
  } catch {
    return null
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
  const categoryCodes = new Set(arrayRecords(context.food_categories).map((category) => String(category.code)))
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
    const categoryCode = String(suggestion.category_code || '')
    const categoryWarning = categoryCode && !categoryCodes.has(categoryCode)
      ? `Unknown category "${categoryCode}" mapped to other.`
      : ''
    const safetyStatus = matched.length > 0
      ? 'blocked'
      : rotation.status === 'blocked' || missingNutrition || inventoryValidation.status === 'review_needed' || Boolean(categoryWarning)
        ? 'review_needed'
        : inventoryValidation.status === 'blocked'
          ? 'blocked'
        : existingStatus
    return {
      ...suggestion,
      category_code: categoryWarning ? 'other' : suggestion.category_code,
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
        ...(categoryWarning ? [categoryWarning] : []),
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
  aiKeySource = 'not_configured',
}: {
  configured: boolean
  model: string
  action: string
  context: Record<string, unknown>
  inventoryForecast: InventoryForecast
  reason: string
  aiKeySource?: string
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
    ai_provider: 'gemini',
    ai_key_source: aiKeySource,
    ai_configured: configured,
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

async function decryptSecret(ciphertext: string, ivText: string) {
  const key = await encryptionKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivText) },
    key,
    base64ToBytes(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

async function encryptionKey() {
  const secret = Deno.env.get('APP_USER_SECRET_ENCRYPTION_KEY')
  if (!secret || secret.length < 32) throw new Error('User key encryption secret is not configured.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt'])
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
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
